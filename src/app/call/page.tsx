"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DailyCall } from "@daily-co/daily-js";
import {
  fetchSummary,
  fetchTavusUrl,
  endTavusConversation,
  endTavusConversationForSession,
  fetchCallSessions,
  executeToolCall,
  finishSession,
} from "@/lib/api";
import { useToolFeed } from "@/hooks/useToolFeed";
import { ToolStatus } from "@/components/ToolStatus";
import { CallDetails } from "@/components/CallDetails";
import { CallSessionsTable } from "@/components/CallSessionsTable";
import type { CallSessionRow, SessionSummaryResponse, TranscriptItem } from "@/types";

// Architecture:
// - Tavus CVI iframe: renders avatar + handles user mic/camera + drives lip-sync.
// - Background Daily call object (audio/video off, joined BEFORE user's iframe):
//     • Joins first → appears as 1 guest (vs 2 guests if user joins first).
//     • Receives all Tavus events via Daily app-message (tool calls, utterances, speaking state).
//     • Sends tool results back via sendAppMessage.
// - Greeting fix: custom_greeting fires to our silent call object (no audio → user misses it).
//   We detect this and re-trigger via conversation.echo after the user's iframe joins.
// - Summary fix: transcript is collected from app-message utterance events, so finishSession
//   always has real content. Polling only starts AFTER the transcript is saved.

type CallState = "idle" | "connecting" | "connected" | "ended";

const GREETING =
  "Hello! I'm Maya, your Mykare healthcare assistant. How can I help you today?";

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
  const [sessions, setSessions] = useState<CallSessionRow[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const tavusConvIdRef = useRef<string>("");
  const sessionIdRef = useRef<string>("");
  const summaryRequestIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tavusTranscriptRef = useRef<TranscriptItem[]>([]);
  const callDurationRef = useRef(0);
  const dailyCallRef = useRef<DailyCall | null>(null);
  const speakingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether the replica has spoken anything — used to detect if custom_greeting
  // was silently consumed by our call object before the user's iframe loaded.
  const greetingReceivedRef = useRef(false);

  // Stable refs so Daily app-message closure always calls the latest version.
  const addEventRef = useRef<((e: import("@/types").ToolEvent) => void) | null>(null);
  const handleSummaryReadyRef = useRef<((id: string) => Promise<void>) | null>(null);

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

    for (let attempt = 0; attempt <= 12; attempt++) {
      try {
        const data = await fetchSummary(sessionId);
        if (summaryRequestIdRef.current !== requestId) return;
        setSummaryGenerating(false);
        setSummary(data);
        await loadSessions();
        return;
      } catch {
        if (attempt === 12) {
          if (summaryRequestIdRef.current !== requestId) return;
          setSummaryGenerating(false);
          await loadSessions();
          return;
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
    }
  }, [loadSessions]);

  const { events, addEvent, clearEvents } = useToolFeed(handleSummaryReady);

  useEffect(() => { addEventRef.current = addEvent; }, [addEvent]);
  useEffect(() => { handleSummaryReadyRef.current = handleSummaryReady; }, [handleSummaryReady]);

  useEffect(() => { void loadSessions(); }, [loadSessions]);
  useEffect(() => { callDurationRef.current = callDuration; }, [callDuration]);

  useEffect(() => {
    if (callState === "connected") {
      timerRef.current = setInterval(() => setCallDuration((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState]);

  // ── Speaking helpers ───────────────────────────────────────────────────────

  function markSpeaking() {
    if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
    setIsSpeaking(true);
  }

  function scheduleSpeakingStop(ms = 800) {
    if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
    speakingTimerRef.current = setTimeout(() => setIsSpeaking(false), ms);
  }

  // ── Daily app-message handler ─────────────────────────────────────────────
  // All Tavus conversation events travel through Daily's data channel.

  function handleAppMessage(rawData: unknown) {
    if (!rawData || typeof rawData !== "object") return;
    const msg = rawData as Record<string, unknown>;
    const eventType = (msg.event_type ?? msg.eventType) as string | undefined;
    if (!eventType?.startsWith("conversation.")) return;
    const props = (msg.properties ?? {}) as Record<string, unknown>;

    if (eventType === "conversation.replica.started_speaking") {
      greetingReceivedRef.current = true;
      markSpeaking();
      return;
    }
    if (eventType === "conversation.replica.stopped_speaking") {
      scheduleSpeakingStop(400);
      return;
    }

    if (eventType === "conversation.utterance") {
      const role = props.role === "replica" ? "assistant" : props.role as string;
      const speech = (props.speech ?? props.text) as string | undefined;
      if ((role === "user" || role === "assistant") && typeof speech === "string" && speech.trim()) {
        if (role === "assistant") greetingReceivedRef.current = true;
        tavusTranscriptRef.current.push({
          role: role as "user" | "assistant",
          content: speech,
          ts: new Date().toISOString(),
        });
      }
      if (props.role === "replica" && typeof speech === "string" && speech.trim()) {
        markSpeaking(); scheduleSpeakingStop(1500);
      } else if (props.role === "user") {
        scheduleSpeakingStop(200);
      }
      return;
    }

    if (eventType === "conversation.ended") {
      void endCall();
      return;
    }

    if (eventType === "conversation.tool_call") {
      const fn = props.function && typeof props.function === "object"
        ? props.function as Record<string, unknown> : {};
      const tool = (props.name ?? props.tool_name ?? fn.name) as string | undefined;
      const args = normalizeArgs(props.arguments ?? fn.arguments ?? {});
      const toolCallId = (props.id ?? props.tool_call_id ?? "") as string;

      if (typeof tool !== "string" || !sessionIdRef.current) return;

      addEventRef.current?.({
        id: `${tool}-${Date.now()}-pending`,
        type: "tool_call", tool, status: "pending",
        display: tool === "end_conversation" ? "Generating summary..." : "Running action...",
        ts: Date.now(),
      });

      executeToolCall(sessionIdRef.current, tool, args)
        .then((result) => {
          addEventRef.current?.({
            id: `${tool}-${Date.now()}-done`,
            type: "tool_call", tool, status: result.status, display: result.display,
            ts: Date.now(),
          });
          // Send result back so Tavus LLM can continue.
          // Tavus expects conversation.respond or conversation.append_llm_context to consume tool results.
          dailyCallRef.current?.sendAppMessage({
            message_type: "conversation",
            event_type: "conversation.respond",
            properties: { text: `[System: The tool ${tool} was executed. Result: ${JSON.stringify(result.result ?? result)}]` },
          }, "*");
          if (tool === "end_conversation") {
            const sid = sessionIdRef.current;
            finishSession(sid, [...tavusTranscriptRef.current])
              .then(() => handleSummaryReadyRef.current?.(sid))
              .catch(() => handleSummaryReadyRef.current?.(sid));
          }
        })
        .catch((err) => {
          const errMsg = err instanceof Error ? err.message : "Action failed";
          addEventRef.current?.({
            id: `${tool}-${Date.now()}-error`,
            type: "tool_call", tool, status: "error", display: errMsg, ts: Date.now(),
          });
          dailyCallRef.current?.sendAppMessage({
            message_type: "conversation",
            event_type: "conversation.respond",
            properties: { text: `[System: The tool ${tool} encountered an error: ${errMsg}]` },
          }, "*");
        });
    }
  }

  // ── Daily teardown ─────────────────────────────────────────────────────────

  async function teardownDaily() {
    const daily = dailyCallRef.current;
    dailyCallRef.current = null;
    if (!daily) return;
    try { await daily.leave(); } catch { /* ignore */ }
    try { daily.destroy(); } catch { /* ignore */ }
  }

  // ── Call control ───────────────────────────────────────────────────────────

  async function startCall() {
    setCallState("connecting");
    setSummary(null);
    setSummaryGenerating(false);
    summaryRequestIdRef.current += 1;
    clearEvents();
    setCallDuration(0);
    setFrozenDuration(0);
    tavusTranscriptRef.current = [];
    greetingReceivedRef.current = false;
    sessionIdRef.current = randomRoomName();

    try {
      const { conversation_id, conversation_url } = await fetchTavusUrl(sessionIdRef.current);
      tavusConvIdRef.current = conversation_id;

      // Join the Daily room BEFORE setting the iframe URL so our call object
      // is participant #1. This prevents a second "guest" tile from appearing
      // when the user's iframe joins later as participant #2.
      const DailyIframe = (await import("@daily-co/daily-js")).default;
      const daily = DailyIframe.createCallObject({ startAudioOff: true, startVideoOff: true });
      daily.on("app-message", (e: { data: unknown }) => handleAppMessage(e.data));
      await daily.join({ url: conversation_url, subscribeToTracksAutomatically: false });
      dailyCallRef.current = daily;

      setTavusUrl(conversation_url);
      setCallState("connected");
    } catch (err) {
      console.error("Failed to start call:", err);
      await teardownDaily();
      setCallState("idle");
    }
  }

  async function endCall() {
    const convId = tavusConvIdRef.current;
    const sid = sessionIdRef.current;
    const transcript = [...tavusTranscriptRef.current];

    tavusConvIdRef.current = "";
    setTavusUrl(null);
    setFrozenDuration(callDurationRef.current);
    setCallState("ended");
    setIsSpeaking(false);
    if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);

    await teardownDaily();

    if (convId) endTavusConversationForSession(convId, sid).catch(() => {});

    if (sid) {
      if (transcript.length > 0) {
        // We have real transcript from app-message events — use it directly.
        // This avoids the race condition where finishSession saves an empty summary
        // before _sync_tavus_transcript can overwrite it with the real one.
        finishSession(sid, transcript)
          .then(() => handleSummaryReady(sid))
          .catch(() => handleSummaryReady(sid));
      } else {
        // No transcript collected — let endTavusConversationForSession handle it
        // via _sync_tavus_transcript (fetches transcript from Tavus API, ~4-8s).
        // Wait before polling so the real summary has time to be saved.
        setTimeout(() => handleSummaryReady(sid), 6000);
      }
    }
  }

  // ── iframe postMessage — "joined-meeting" only ─────────────────────────────
  // When the user's iframe joins the Daily room, check if the greeting was
  // silently consumed by our call object and re-trigger it if so.

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.action !== "joined-meeting") return;
      // Give Tavus 1.5s to deliver any pending greeting utterance event.
      // If none arrives, the custom_greeting was consumed by our silent call
      // object → re-trigger it via conversation.echo.
      setTimeout(() => {
        if (!greetingReceivedRef.current && dailyCallRef.current) {
          dailyCallRef.current.sendAppMessage({
            message_type: "conversation",
            event_type: "conversation.echo",
            properties: { modality: "text", text: GREETING },
          }, "*");
        }
      }, 1500);
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (tavusConvIdRef.current) endTavusConversation(tavusConvIdRef.current).catch(() => {});
      summaryRequestIdRef.current += 1;
      if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
      void teardownDaily();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function formatDuration(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  const isInCall = callState === "connecting" || callState === "connected";
  const showPanel = isInCall || callState === "ended";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-4 gap-5">

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

      <div className="flex flex-col lg:flex-row gap-5 w-full max-w-5xl items-start justify-center">

        <div className="w-full max-w-xl mx-auto lg:mx-0 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/5">

          <div className="relative bg-slate-900" style={{ height: 480 }}>

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

            {tavusUrl && (
              <iframe
                src={tavusUrl}
                allow="camera; microphone; autoplay; display-capture"
                className="absolute inset-0 w-full h-full border-0"
                title="Maya avatar"
              />
            )}

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

          <div className="bg-slate-800/90 backdrop-blur-sm border-t border-white/5 px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-300 ${
                callState === "connected" ? "bg-emerald-400 shadow-sm shadow-emerald-400/80"
                  : callState === "connecting" ? "bg-amber-400 animate-pulse"
                  : "bg-slate-600"
              }`} />
              <span className="text-slate-300 text-sm truncate">
                {callState === "idle"       && "Ready to connect"}
                {callState === "connecting" && "Preparing avatar…"}
                {callState === "connected"  && (isSpeaking ? "Maya is speaking" : "Listening…")}
                {callState === "ended"      && "Call ended"}
              </span>
            </div>

            {!isInCall ? (
              <button onClick={startCall}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold px-5 py-2.5 rounded-full transition-all duration-150 shadow-lg shadow-indigo-600/30 flex-shrink-0">
                <PhoneIcon />
                {callState === "ended" ? "New Call" : "Start Call"}
              </button>
            ) : (
              <button onClick={endCall} disabled={callState === "connecting"}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-full transition-all duration-150 shadow-lg shadow-red-600/30 flex-shrink-0">
                <PhoneOffIcon />
                End Call
              </button>
            )}
          </div>
        </div>

        {showPanel && (
          <div className="w-full lg:w-80 flex-shrink-0 space-y-3 animate-slide-up-fade">
            <ToolStatus events={events} isInCall={isInCall} />

            {callState === "ended" && summaryGenerating && !summary && (
              <div className="rounded-xl border border-indigo-800/40 bg-indigo-950/30 px-4 py-3.5 flex items-center gap-3 animate-slide-up-fade">
                <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-indigo-400 animate-spin flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-indigo-300">Generating Summary</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Analysing conversation…</p>
                </div>
              </div>
            )}

            {callState === "ended" && summary && (
              <CallDetails data={summary} duration={frozenDuration} />
            )}
          </div>
        )}
      </div>

      <CallSessionsTable sessions={sessions} loading={sessionsLoading} onRefresh={loadSessions} />
    </main>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function safeJsonParse(v: string): Record<string, unknown> {
  try { const p = JSON.parse(v); return p && typeof p === "object" ? p : {}; }
  catch { return {}; }
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
