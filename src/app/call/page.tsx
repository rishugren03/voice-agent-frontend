"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, RemoteParticipant, Track } from "livekit-client";
import { fetchToken, fetchSummary, fetchTavusUrl, endTavusConversation } from "@/lib/api";
import { useToolFeed } from "@/hooks/useToolFeed";
import { ToolStatus } from "@/components/ToolStatus";
import { CallSummary } from "@/components/CallSummary";
import type { SessionSummaryResponse } from "@/types";

type CallState = "idle" | "connecting" | "waiting-join" | "joining" | "connected" | "ended";

function randomRoomName() {
  return `mykare-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function CallPage() {
  const [callState, setCallState] = useState<CallState>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [summary, setSummary] = useState<SessionSummaryResponse | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [tavusUrl, setTavusUrl] = useState<string | null>(null);
  const tavusConvIdRef = useRef<string>("");
  // Holds the LiveKit connect function until user clicks Join inside the Tavus iframe
  const pendingLiveKitRef = useRef<(() => Promise<void>) | null>(null);
  const roomRef = useRef<Room | null>(null);
  const sessionIdRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const amplitudeRef = useRef<number>(0);
  const rafIdRef = useRef<number>(0);

  const handleSummaryReady = useCallback(async (sessionId: string) => {
    try {
      const data = await fetchSummary(sessionId);
      setSummary(data);
    } catch {
      setTimeout(async () => {
        try { setSummary(await fetchSummary(sessionId)); }
        catch { console.warn("Summary not available"); }
      }, 2000);
    }
  }, []);

  const { events } = useToolFeed(roomRef.current, handleSummaryReady);

  useEffect(() => {
    if (callState === "connected" || callState === "joining") {
      setCallDuration(0);
      timerRef.current = setInterval(() => setCallDuration((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState]);

  function startAmplitudeLoop() {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    function loop() {
      analyserRef.current?.getByteFrequencyData(data);
      const speechSlice = data.slice(0, data.length >> 1);
      const avg = speechSlice.reduce((a, b) => a + b, 0) / speechSlice.length;
      amplitudeRef.current = Math.min(1, avg / 90);
      rafIdRef.current = requestAnimationFrame(loop);
    }
    rafIdRef.current = requestAnimationFrame(loop);
  }

  function teardownAudio() {
    cancelAnimationFrame(rafIdRef.current);
    amplitudeRef.current = 0;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
  }

  async function startCall() {
    setCallState("connecting");
    const room = new Room();
    roomRef.current = room;
    sessionIdRef.current = randomRoomName();

    // Unlock audio NOW while we're inside the user-gesture handler (button click).
    room.startAudio().catch(() => {});

    const audioCtx = new AudioContext();
    await audioCtx.resume();
    audioCtxRef.current = audioCtx;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      setIsSpeaking(speakers.some((s) => s instanceof RemoteParticipant));
    });
    room.on(RoomEvent.Disconnected, () => {
      setCallState("ended");
      setIsSpeaking(false);
      teardownAudio();
    });
    room.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach();
        el.dataset.livekitAudio = "1";
        document.body.appendChild(el);

        try {
          const stream = new MediaStream([track.mediaStreamTrack]);
          const src = audioCtx.createMediaStreamSource(stream);
          src.connect(analyser);
          startAmplitudeLoop();
        } catch { /* analysis unavailable; isSpeaking fallback still works */ }
      }
    });
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) track.detach().forEach((el) => el.remove());
    });

    // The actual LiveKit connect — called only after user clicks Join in Tavus
    async function connectLiveKit() {
      setCallState("joining");
      try {
        const { token, url } = await fetchToken(sessionIdRef.current, `user-${Date.now()}`);
        await room.connect(url, token, { autoSubscribe: true });
        await room.localParticipant.setMicrophoneEnabled(true);
        setCallState("connected");
      } catch (err) {
        console.error("LiveKit connection failed", err);
        teardownAudio();
        setCallState("idle");
      }
    }

    // Phase 1: load Tavus iframe — user will see avatar with greeting, then Join button
    try {
      const { conversation_id, conversation_url } = await fetchTavusUrl(sessionIdRef.current);
      tavusConvIdRef.current = conversation_id;
      setTavusUrl(conversation_url);
      // Park LiveKit connect until the Tavus joined-meeting postMessage fires
      pendingLiveKitRef.current = connectLiveKit;
      setCallState("waiting-join");
    } catch (err) {
      console.warn("Tavus unavailable, connecting directly:", err);
      // No Tavus — connect LiveKit straight away
      await connectLiveKit();
    }
  }

  async function endCall() {
    if (tavusConvIdRef.current) {
      endTavusConversation(tavusConvIdRef.current).catch(() => {});
      tavusConvIdRef.current = "";
    }
    setTavusUrl(null);
    await roomRef.current?.disconnect();
    teardownAudio();
    setCallState("ended");
  }

  // Tavus (Daily.co) fires "joined-meeting" when the user clicks the Join button.
  // Only then do we connect LiveKit so the agent starts at the same moment.
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.action === "joined-meeting" && pendingLiveKitRef.current) {
        const connect = pendingLiveKitRef.current;
        pendingLiveKitRef.current = null;
        connect();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    return () => {
      if (tavusConvIdRef.current) {
        endTavusConversation(tavusConvIdRef.current).catch(() => {});
      }
      roomRef.current?.disconnect();
      document.querySelectorAll("audio[data-livekit-audio]").forEach((el) => el.remove());
      teardownAudio();
    };
  }, []);

  function formatDuration(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  const isInCall =
    callState === "connecting" ||
    callState === "waiting-join" ||
    callState === "joining" ||
    callState === "connected";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-4 gap-4">

      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14l4-4h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
          </svg>
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-none">Mykare AI</p>
          <p className="text-slate-500 text-[11px] mt-0.5">Healthcare Assistant</p>
        </div>
      </div>

      {/* Call card */}
      <div className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/5">

        {/* Video viewport */}
        <div className="relative bg-slate-900" style={{ height: 480 }}>

          {/* ── IDLE / ENDED ── */}
          {(callState === "idle" || callState === "ended") && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-800 to-slate-900">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-xl shadow-indigo-500/30">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="white" opacity="0.9">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                  </svg>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-slate-400 border-2 border-slate-900" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-xl">Maya</p>
                <p className="text-slate-400 text-sm mt-0.5">
                  {callState === "ended" ? "Call ended" : "Healthcare front-desk assistant"}
                </p>
              </div>
            </div>
          )}

          {/* ── CONNECTING (fetching Tavus URL) ── */}
          {callState === "connecting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-slate-900 z-10">
              <div className="relative flex items-center justify-center">
                <span className="absolute w-20 h-20 rounded-full border-2 border-indigo-500/30 animate-ping" />
                <span className="absolute w-14 h-14 rounded-full border-2 border-indigo-400/50 animate-ping" style={{ animationDelay: "0.15s" }} />
                <div className="w-10 h-10 rounded-full border-t-transparent border-indigo-500 animate-spin" style={{ borderWidth: 3, borderStyle: "solid" }} />
              </div>
              <div className="text-center">
                <p className="text-white font-medium">Preparing Maya…</p>
                <p className="text-slate-500 text-sm mt-1">Loading avatar session</p>
              </div>
            </div>
          )}

          {/* ── JOINING (LiveKit connecting after user clicked Join) ── */}
          {callState === "joining" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-slate-900/80 z-10">
              <div className="w-10 h-10 rounded-full border-t-transparent border-emerald-400 animate-spin" style={{ borderWidth: 3, borderStyle: "solid" }} />
              <div className="text-center">
                <p className="text-white font-medium">Starting conversation…</p>
                <p className="text-slate-500 text-sm mt-1">Connecting to Maya</p>
              </div>
            </div>
          )}

          {/* ── TAVUS IFRAME (visible during waiting-join and connected) ── */}
          {tavusUrl && (
            <iframe
              src={tavusUrl}
              allow="camera; microphone; autoplay; display-capture"
              className="absolute inset-0 w-full h-full border-0"
              title="Maya avatar"
            />
          )}

          {/* Speaking badge — overlaid on the iframe */}
          {callState === "connected" && (
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <div className={`flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 transition-opacity duration-300 ${isSpeaking ? "opacity-100" : "opacity-0"}`}>
                <span className="flex gap-0.5 items-end h-3">
                  {[1, 1.5, 2, 1.5, 1].map((h, i) => (
                    <span key={i} className="w-0.5 bg-emerald-400 rounded-full wave-bar" style={{ height: `${h * 5}px`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </span>
                <span className="text-white text-xs font-medium">Maya is speaking</span>
              </div>
              <div className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
                <span className="text-white text-xs font-mono">{formatDuration(callDuration)}</span>
              </div>
            </div>
          )}

          {/* Ended overlay after iframe is cleared */}
          {callState === "ended" && !tavusUrl && (
            <div className="absolute bottom-3 left-3 right-3 flex justify-center pointer-events-none">
              <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-1.5">
                <span className="text-slate-300 text-xs">Session ended · {formatDuration(callDuration)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Controls bar */}
        <div className="bg-slate-800/90 backdrop-blur-sm border-t border-white/5 px-6 py-4 flex items-center justify-between gap-4">

          {/* Status */}
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              callState === "connected" ? "bg-emerald-400 shadow-sm shadow-emerald-400/80"
              : (callState === "connecting" || callState === "waiting-join" || callState === "joining") ? "bg-amber-400 animate-pulse"
              : "bg-slate-600"
            }`} />
            <span className="text-slate-300 text-sm truncate">
              {callState === "idle" && "Ready to connect"}
              {callState === "connecting" && "Preparing avatar…"}
              {callState === "waiting-join" && "Click Join to start"}
              {callState === "joining" && "Connecting…"}
              {callState === "connected" && (isSpeaking ? "Maya is speaking" : "Listening…")}
              {callState === "ended" && "Call ended"}
            </span>
          </div>

          {/* Action button */}
          {!isInCall ? (
            <button
              onClick={startCall}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold px-5 py-2.5 rounded-full transition-all duration-150 shadow-lg shadow-indigo-600/30 flex-shrink-0"
            >
              <PhoneIcon />
              {callState === "ended" ? "New Call" : "Start Call"}
            </button>
          ) : (
            <button
              onClick={endCall}
              disabled={callState === "connecting"}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-full transition-all duration-150 shadow-lg shadow-red-600/30 flex-shrink-0"
            >
              <PhoneOffIcon />
              End Call
            </button>
          )}
        </div>
      </div>

      {/* Live tool feed */}
      {events.length > 0 && (
        <div className="w-full max-w-xl">
          <ToolStatus events={events} />
        </div>
      )}

      {summary && <CallSummary data={summary} onClose={() => setSummary(null)} />}
    </main>
  );
}

function PhoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
    </svg>
  );
}

function PhoneOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.71 16.67C20.66 13.78 16.54 12 12 12 7.46 12 3.34 13.78.29 16.67c-.18.18-.29.43-.29.68 0 .27.11.52.29.7l2.48 2.48c.18.18.43.29.7.29.28 0 .54-.12.71-.31.59-.65 1.26-1.21 2-1.68.24-.15.4-.41.4-.7v-3.2c1.52-.55 3.15-.85 4.83-.85 1.68 0 3.31.3 4.83.85v3.2c0 .29.16.55.4.7.74.47 1.41 1.03 2 1.68.17.19.43.31.71.31.27 0 .52-.11.7-.29l2.48-2.48c.18-.18.29-.43.29-.7 0-.25-.11-.5-.29-.68z"/>
    </svg>
  );
}
