"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, RemoteParticipant, Track } from "livekit-client";
import {
  fetchToken,
  fetchSummary,
  fetchTavusUrl,
  endTavusConversation,
  endTavusConversationForSession,
  fetchCallSessions,
  executeToolCall,
} from "@/lib/api";
import { useToolFeed } from "@/hooks/useToolFeed";
import { ToolStatus } from "@/components/ToolStatus";
import { CallDetails } from "@/components/CallDetails";
import { CallSessionsTable } from "@/components/CallSessionsTable";
import type { CallSessionRow, SessionSummaryResponse, TranscriptItem } from "@/types";

type CallState = "idle" | "connecting" | "waiting-join" | "joining" | "connected" | "ended";

function randomRoomName() {
  return `mykare-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function CallPage() {
  const [callState, setCallState] = useState<CallState>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [summary, setSummary] = useState<SessionSummaryResponse | null>(null);
  const [summaryGenerating, setSummaryGenerating] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [frozenDuration, setFrozenDuration] = useState(0);
  const [tavusUrl, setTavusUrl] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [sessions, setSessions] = useState<CallSessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const tavusConvIdRef = useRef<string>("");
  const pendingLiveKitRef = useRef<(() => Promise<void>) | null>(null);
  const roomRef = useRef<Room | null>(null);
  const sessionIdRef = useRef<string>("");
  const summaryRequestIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tavusTranscriptRef = useRef<TranscriptItem[]>([]);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafIdRef = useRef<number>(0);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      setSessions(await fetchCallSessions());
    } catch (err) {
      console.error("Failed to load call sessions", err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const handleSummaryReady = useCallback(async (sessionId: string) => {
    const requestId = summaryRequestIdRef.current + 1;
    summaryRequestIdRef.current = requestId;
    setSummaryGenerating(true);

    for (let attemptNumber = 0; attemptNumber <= 12; attemptNumber += 1) {
      try {
        const data = await fetchSummary(sessionId);
        if (summaryRequestIdRef.current !== requestId) return;
        setSummaryGenerating(false);
        setSummary(data);
        await loadSessions();
        return;
      } catch {
        if (attemptNumber === 12) {
          if (summaryRequestIdRef.current !== requestId) return;
          setSummaryGenerating(false);
          await loadSessions();
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
    }
  }, [loadSessions]);

  const { events, addEvent, clearEvents } = useToolFeed(room, handleSummaryReady);

  useEffect(() => {
    void Promise.resolve().then(loadSessions);
  }, [loadSessions]);

  useEffect(() => {
    if (callState === "connected" || callState === "joining") {
      timerRef.current = setInterval(() => setCallDuration((s) => s + 1), 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState]);

  function startAmplitudeLoop() {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    function loop() {
      analyserRef.current?.getByteFrequencyData(data);
      const slice = data.slice(0, data.length >> 1);
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
      void avg; // amplitude available via analyserRef if needed later
      rafIdRef.current = requestAnimationFrame(loop);
    }
    rafIdRef.current = requestAnimationFrame(loop);
  }

  function teardownAudio() {
    cancelAnimationFrame(rafIdRef.current);
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
  }

  async function startCall() {
    setCallState("connecting");
    setSummary(null);
    setSummaryGenerating(false);
    summaryRequestIdRef.current += 1;
    clearEvents();
    setCallDuration(0);
    setFrozenDuration(0);
    tavusTranscriptRef.current = [];

    const nextRoom = new Room();
    roomRef.current = nextRoom;
    setRoom(nextRoom);
    sessionIdRef.current = randomRoomName();

    nextRoom.startAudio().catch(() => {});

    const audioCtx = new AudioContext();
    await audioCtx.resume();
    audioCtxRef.current = audioCtx;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    nextRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      setIsSpeaking(speakers.some((s) => s instanceof RemoteParticipant));
    });
    nextRoom.on(RoomEvent.Disconnected, () => {
      setCallState("ended");
      setIsSpeaking(false);
      teardownAudio();
      if (sessionIdRef.current) handleSummaryReady(sessionIdRef.current);
    });
    nextRoom.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) {
        const el = track.attach();
        el.dataset.livekitAudio = "1";
        document.body.appendChild(el);
        try {
          const stream = new MediaStream([track.mediaStreamTrack]);
          const src = audioCtx.createMediaStreamSource(stream);
          src.connect(analyser);
          startAmplitudeLoop();
        } catch { /* audio analysis unavailable */ }
      }
    });
    nextRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track.kind === Track.Kind.Audio) track.detach().forEach((el) => el.remove());
    });

    async function connectLiveKit() {
      setCallState("joining");
      try {
        const { token, url } = await fetchToken(sessionIdRef.current, `user-${Date.now()}`);
        await loadSessions();
        await nextRoom.connect(url, token, { autoSubscribe: true });
        await nextRoom.localParticipant.setMicrophoneEnabled(true);
        setCallState("connected");
      } catch (err) {
        console.error("LiveKit connection failed", err);
        teardownAudio();
        setCallState("idle");
      }
    }

    try {
      const { conversation_id, conversation_url } = await fetchTavusUrl(sessionIdRef.current);
      tavusConvIdRef.current = conversation_id;
      setTavusUrl(conversation_url);
      await connectLiveKit();
    } catch (err) {
      console.warn("Tavus unavailable, connecting directly:", err);
      await connectLiveKit();
    }
  }

  async function endCall() {
    if (tavusConvIdRef.current) {
      endTavusConversationForSession(tavusConvIdRef.current, sessionIdRef.current).catch(() => {});
      tavusConvIdRef.current = "";
    }
    setTavusUrl(null);
    setFrozenDuration(callDuration);
    await roomRef.current?.disconnect();
    teardownAudio();
    setCallState("ended");
    if (sessionIdRef.current) {
      handleSummaryReady(sessionIdRef.current);
    }
  }

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.action === "joined-meeting" && pendingLiveKitRef.current) {
        const connect = pendingLiveKitRef.current;
        pendingLiveKitRef.current = null;
        connect();
      }

      const event = normalizeTavusEvent(e.data);
      if (!event) return;
      const props = event.properties;

      if (event.event_type === "conversation.utterance") {
        const role = props.role === "replica" ? "assistant" : props.role;
        const speech = props.speech ?? props.text;
        if ((role === "user" || role === "assistant") && typeof speech === "string" && speech.trim()) {
          tavusTranscriptRef.current.push({
            role,
            content: speech,
            ts: new Date().toISOString(),
          });
        }
        return;
      }

      if (event.event_type === "conversation.tool_call") {
        const fn = props.function && typeof props.function === "object"
          ? props.function as Record<string, unknown>
          : {};
        const tool =
          props.name ??
          props.tool_name ??
          fn.name;
        const rawArgs =
          props.arguments ??
          fn.arguments ??
          {};
        const args = normalizeArgs(rawArgs);
        if (typeof tool !== "string" || !sessionIdRef.current) return;

        addEvent({
          id: `${tool}-${Date.now()}-pending`,
          type: "tool_call",
          tool,
          status: "pending",
          display: tool === "end_conversation" ? "Generating summary..." : "Running action...",
          ts: Date.now(),
        });

        executeToolCall(sessionIdRef.current, tool, args)
          .then((result) => {
            addEvent({
              id: `${tool}-${Date.now()}-done`,
              type: "tool_call",
              tool,
              status: result.status,
              display: result.display,
              ts: Date.now(),
            });
            if (tool === "end_conversation") handleSummaryReady(sessionIdRef.current);
          })
          .catch((err) => {
            addEvent({
              id: `${tool}-${Date.now()}-error`,
              type: "tool_call",
              tool,
              status: "error",
              display: err instanceof Error ? err.message : "Action failed",
              ts: Date.now(),
            });
          });
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [addEvent, handleSummaryReady]);

  useEffect(() => {
    return () => {
      if (tavusConvIdRef.current) endTavusConversation(tavusConvIdRef.current).catch(() => {});
      roomRef.current?.disconnect();
      summaryRequestIdRef.current += 1;
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

  const showPanel = isInCall || callState === "ended";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-4 gap-5">

      {/* ── Header ── */}
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

      {/* ── Two-column layout ── */}
      <div className="flex flex-col lg:flex-row gap-5 w-full max-w-5xl items-start justify-center">

        {/* ── LEFT: Call card ── */}
        <div className="w-full max-w-xl mx-auto lg:mx-0 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/5">

          {/* Video viewport */}
          <div className="relative bg-slate-900" style={{ height: 480 }}>

            {/* IDLE / ENDED */}
            {(callState === "idle" || callState === "ended") && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-800 to-slate-900">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-xl shadow-indigo-500/30">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="white" opacity="0.9">
                      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                    </svg>
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-slate-900 ${callState === "ended" ? "bg-slate-500" : "bg-slate-400"}`} />
                </div>
                <div className="text-center">
                  <p className="text-white font-semibold text-xl">Maya</p>
                  <p className="text-slate-400 text-sm mt-0.5">
                    {callState === "ended" ? "Call ended · " + formatDuration(frozenDuration) : "Healthcare front-desk assistant"}
                  </p>
                </div>
              </div>
            )}

            {/* CONNECTING */}
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

            {/* JOINING */}
            {callState === "joining" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-slate-900/80 z-10">
                <div className="w-10 h-10 rounded-full border-t-transparent border-emerald-400 animate-spin" style={{ borderWidth: 3, borderStyle: "solid" }} />
                <div className="text-center">
                  <p className="text-white font-medium">Starting conversation…</p>
                  <p className="text-slate-500 text-sm mt-1">Connecting to Maya</p>
                </div>
              </div>
            )}

            {/* TAVUS IFRAME */}
            {tavusUrl && (
              <iframe
                src={tavusUrl}
                allow="camera; microphone; autoplay; display-capture"
                className="absolute inset-0 w-full h-full border-0"
                title="Maya avatar"
              />
            )}

            {/* Speaking badge */}
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
          </div>

          {/* Controls bar */}
          <div className="bg-slate-800/90 backdrop-blur-sm border-t border-white/5 px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-300 ${
                callState === "connected"
                  ? "bg-emerald-400 shadow-sm shadow-emerald-400/80"
                  : (callState === "connecting" || callState === "waiting-join" || callState === "joining")
                  ? "bg-amber-400 animate-pulse"
                  : "bg-slate-600"
              }`} />
              <span className="text-slate-300 text-sm truncate">
                {callState === "idle"         && "Ready to connect"}
                {callState === "connecting"   && "Preparing avatar…"}
                {callState === "waiting-join" && "Click Join to start"}
                {callState === "joining"      && "Connecting…"}
                {callState === "connected"    && (isSpeaking ? "Maya is speaking" : "Listening…")}
                {callState === "ended"        && "Call ended"}
              </span>
            </div>

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

        {/* ── RIGHT: Side panel ── */}
        {showPanel && (
          <div className="w-full lg:w-80 flex-shrink-0 space-y-3 animate-slide-up-fade">

            {/* Live tool feed — always visible while in call or after */}
            <ToolStatus events={events} isInCall={isInCall} />

            {/* Post-call: generating spinner */}
            {callState === "ended" && summaryGenerating && !summary && (
              <div className="rounded-xl border border-indigo-800/40 bg-indigo-950/30 px-4 py-3.5 flex items-center gap-3 animate-slide-up-fade">
                <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-indigo-400 animate-spin flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-indigo-300">Generating Summary</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Analysing conversation…</p>
                </div>
              </div>
            )}

            {/* Post-call: inline call details (Vapi-style) */}
            {callState === "ended" && summary && (
              <CallDetails data={summary} duration={frozenDuration} />
            )}

          </div>
        )}
      </div>

      <CallSessionsTable
        sessions={sessions}
        loading={sessionsLoading}
        onRefresh={loadSessions}
      />

    </main>
  );
}

type TavusEvent = {
  event_type?: string;
  eventType?: string;
  properties?: Record<string, unknown>;
  data?: {
    event_type?: string;
    eventType?: string;
    properties?: Record<string, unknown>;
  };
};

function normalizeTavusEvent(input: unknown): { event_type: string; properties: Record<string, unknown> } | null {
  if (!input || typeof input !== "object") return null;
  const msg = input as TavusEvent;
  const source = msg.data?.event_type || msg.data?.eventType ? msg.data : msg;
  const eventType = source.event_type ?? source.eventType;
  if (!eventType?.startsWith("conversation.")) return null;
  return { event_type: eventType, properties: source.properties ?? {} };
}

function safeJsonParse(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeArgs(value: unknown): Record<string, unknown> {
  if (typeof value === "string") return safeJsonParse(value);
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
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
