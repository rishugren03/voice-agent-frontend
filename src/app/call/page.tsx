"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DailyCall } from "@daily-co/daily-js";
import {
  fetchSummary,
  fetchTavusUrl,
  endTavusConversation,
  endTavusConversationForSession,
  executeToolCall,
  finishSession,
} from "@/lib/api";
import { useToolFeed } from "@/hooks/useToolFeed";
import { ToolStatus } from "@/components/ToolStatus";
import { CallDetails } from "@/components/CallDetails";
import type { SessionSummaryResponse, TranscriptItem, ToolEvent } from "@/types";
import {
  Phone,
  PhoneOff,
  Mic,
  Settings,
  Loader2,
  Activity,
  Headphones,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CallState = "idle" | "connecting" | "connected" | "ended";

const GREETING = "Hello! I'm Maya, your Mykare healthcare assistant. How can I help you today?";

export default function CallPage() {
  const [callState, setCallState] = useState<CallState>("idle");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [summary, setSummary] = useState<SessionSummaryResponse | null>(null);
  const [summaryGenerating, setSummaryGenerating] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [frozenDuration, setFrozenDuration] = useState(0);
  const [tavusUrl, setTavusUrl] = useState<string | null>(null);

  const tavusConvIdRef = useRef<string>("");
  const sessionIdRef = useRef<string>("");
  const summaryRequestIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tavusTranscriptRef = useRef<TranscriptItem[]>([]);
  const callDurationRef = useRef(0);
  const dailyCallRef = useRef<DailyCall | null>(null);
  const speakingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeJoinedRef = useRef(false);

  const addEventRef = useRef<((e: ToolEvent) => void) | null>(null);
  const handleSummaryReadyRef = useRef<((id: string) => Promise<void>) | null>(null);

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
        return;
      } catch {
        if (attempt === 12) {
          if (summaryRequestIdRef.current !== requestId) return;
          setSummaryGenerating(false);
          return;
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
    }
  }, []);

  const { events, addEvent, clearEvents } = useToolFeed(handleSummaryReady);

  useEffect(() => { addEventRef.current = addEvent; }, [addEvent]);
  useEffect(() => { handleSummaryReadyRef.current = handleSummaryReady; }, [handleSummaryReady]);
  useEffect(() => { callDurationRef.current = callDuration; }, [callDuration]);

  useEffect(() => {
    if (callState === "connected") {
      timerRef.current = setInterval(() => setCallDuration((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState]);

  function markSpeaking() {
    if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
    setIsSpeaking(true);
  }

  function scheduleSpeakingStop(ms = 800) {
    if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
    speakingTimerRef.current = setTimeout(() => setIsSpeaking(false), ms);
  }

  function handleAppMessage(rawData: unknown) {
    if (!rawData || typeof rawData !== "object") return;
    const msg = rawData as Record<string, unknown>;
    const eventType = (msg.event_type ?? msg.eventType) as string | undefined;
    if (!eventType?.startsWith("conversation.")) return;
    const props = (msg.properties ?? {}) as Record<string, unknown>;

    if (eventType === "conversation.replica.started_speaking") { markSpeaking(); return; }
    if (eventType === "conversation.replica.stopped_speaking") { scheduleSpeakingStop(400); return; }

    if (eventType === "conversation.utterance") {
      const role = props.role === "replica" ? "assistant" : props.role as string;
      const speech = (props.speech ?? props.text) as string | undefined;
      if ((role === "user" || role === "assistant") && typeof speech === "string" && speech.trim()) {
        tavusTranscriptRef.current.push({ role: role as "user" | "assistant", content: speech, ts: new Date().toISOString() });
      }
      if (props.role === "replica" && typeof speech === "string" && speech.trim()) {
        markSpeaking(); scheduleSpeakingStop(1500);
      } else if (props.role === "user") {
        scheduleSpeakingStop(200);
      }
      return;
    }

    if (eventType === "conversation.ended") { void endCall(); return; }

    if (eventType === "conversation.tool_call") {
      const fn = props.function && typeof props.function === "object" ? props.function as Record<string, unknown> : {};
      const tool = (props.name ?? props.tool_name ?? fn.name) as string | undefined;
      let args = props.arguments ?? fn.arguments ?? {};
      if (typeof args === "string") {
        try { args = JSON.parse(args); } catch { args = {}; }
      }
      if (typeof tool !== "string" || !sessionIdRef.current) return;

      addEventRef.current?.({ id: `${tool}-${Date.now()}-pending`, type: "tool_call", tool, status: "pending", display: tool === "end_conversation" ? "Generating summary..." : "Running action...", ts: Date.now() });

      executeToolCall(sessionIdRef.current, tool, args as Record<string, unknown>)
        .then((result) => {
          addEventRef.current?.({ id: `${tool}-${Date.now()}-done`, type: "tool_call", tool, status: result.status, display: result.display, ts: Date.now() });
          dailyCallRef.current?.sendAppMessage({ message_type: "conversation", event_type: "conversation.respond", properties: { text: `[System: The tool ${tool} was executed. Result: ${JSON.stringify(result.result ?? result)}]` } }, "*");
          if (tool === "end_conversation") {
            const sid = sessionIdRef.current;
            finishSession(sid, [...tavusTranscriptRef.current]).then(() => handleSummaryReadyRef.current?.(sid)).catch(() => handleSummaryReadyRef.current?.(sid));
          }
        })
        .catch((err) => {
          const errMsg = err instanceof Error ? err.message : "Action failed";
          addEventRef.current?.({ id: `${tool}-${Date.now()}-error`, type: "tool_call", tool, status: "error", display: errMsg, ts: Date.now() });
          dailyCallRef.current?.sendAppMessage({ message_type: "conversation", event_type: "conversation.respond", properties: { text: `[System: The tool ${tool} encountered an error: ${errMsg}]` } }, "*");
        });
    }
  }

  async function teardownDaily() {
    const daily = dailyCallRef.current;
    dailyCallRef.current = null;
    if (!daily) return;
    try { await daily.leave(); } catch { /* ignore */ }
    try { daily.destroy(); } catch { /* ignore */ }
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
    iframeJoinedRef.current = false;
    sessionIdRef.current = `session-${Date.now()}`;

    try {
      const { conversation_id, conversation_url } = await fetchTavusUrl(sessionIdRef.current);
      tavusConvIdRef.current = conversation_id;
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
        finishSession(sid, transcript).then(() => handleSummaryReady(sid)).catch(() => handleSummaryReady(sid));
      } else {
        setTimeout(() => handleSummaryReady(sid), 6000);
      }
    }
  }

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.action === "joined-meeting" && dailyCallRef.current) {
        iframeJoinedRef.current = true;
        dailyCallRef.current.sendAppMessage({ message_type: "conversation", event_type: "conversation.echo", conversation_id: tavusConvIdRef.current, properties: { text: GREETING } }, "*");
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    return () => {
      if (tavusConvIdRef.current) endTavusConversation(tavusConvIdRef.current).catch(() => {});
      summaryRequestIdRef.current += 1;
      if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current);
      void teardownDaily();
    };
  }, []);

  function formatDuration(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  }

  const isInCall = callState === "connecting" || callState === "connected";

  return (
    <div className="space-y-5 animate-slide-up-fade">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-teal-600 mb-1">
            <Activity className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-widest">
              {callState === "connected" ? "Active" : "Console"}
            </span>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Consultation</h1>
          <p className="text-sm text-slate-500 mt-0.5">Connect with Maya, your AI healthcare assistant.</p>
        </div>

        {callState === "connected" && (
          <div className="flex items-center gap-4 px-4 py-3 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Duration</p>
              <p className="text-lg font-mono font-semibold text-teal-600 mt-0.5">{formatDuration(callDuration)}</p>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-2 h-2 rounded-full transition-all duration-500",
                isSpeaking ? "bg-emerald-500" : "bg-slate-300"
              )} />
              <div>
                <p className="text-xs font-medium text-slate-800">{isSpeaking ? "Maya speaking" : "Maya listening"}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Connected</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* Video / Avatar panel */}
        <div className="lg:col-span-8">
          <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-lg">

            {callState !== "connected" && !tavusUrl && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
                {callState === "connecting" ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                    <div className="text-center">
                      <h3 className="text-base font-medium text-white">Connecting...</h3>
                      <p className="text-sm text-slate-400 mt-0.5">Preparing your session with Maya.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-5 px-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Headphones className="w-8 h-8 text-slate-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {callState === "ended" ? "Session ended" : "Ready"}
                      </h3>
                      <p className="text-sm text-slate-400 mt-1 max-w-xs leading-relaxed">
                        {callState === "ended"
                          ? `Last session was ${formatDuration(frozenDuration)}. Session report is being prepared.`
                          : "Start a consultation to connect with Maya."}
                      </p>
                    </div>
                    <button
                      onClick={startCall}
                      className="bg-teal-600 hover:bg-teal-500 text-white px-7 py-2.5 rounded-xl font-medium text-sm transition-colors flex items-center gap-2"
                    >
                      <Phone className="w-4 h-4" />
                      {callState === "ended" ? "New Consultation" : "Start Consultation"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {tavusUrl && (
              <iframe
                src={tavusUrl}
                allow="camera; microphone; autoplay; display-capture"
                className="absolute inset-0 w-full h-full border-0 z-10"
                title="Maya Avatar"
              />
            )}

            {callState === "connected" && (
              <div className="absolute top-3 left-3 z-20 pointer-events-none">
                <div className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-1.5 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-medium text-emerald-300 tracking-wide">Live</span>
                </div>
              </div>
            )}
          </div>

          {/* Control bar */}
          {callState === "connected" && (
            <div className="mt-3 flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg bg-slate-50 text-slate-500 hover:bg-teal-50 hover:text-teal-600 transition-colors border border-slate-200">
                  <Mic className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-lg bg-slate-50 text-slate-500 hover:bg-teal-50 hover:text-teal-600 transition-colors border border-slate-200">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={endCall}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
              >
                <PhoneOff className="w-4 h-4" />
                End Session
              </button>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-4">
          {callState === "ended" && summary ? (
            <div className="space-y-3 animate-slide-up-fade">
              <div className="flex items-center gap-2 px-1">
                <div className="w-1 h-4 bg-teal-500 rounded-full" />
                <h3 className="text-sm font-medium text-slate-800">Session Summary</h3>
              </div>
              <CallDetails summary={summary.summary} cost_breakdown={summary.cost_breakdown} />
              <button
                onClick={startCall}
                className="w-full py-2.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl text-xs font-medium text-teal-700 transition-colors flex items-center justify-center gap-2"
              >
                <Phone className="w-3.5 h-3.5" />
                New Consultation
              </button>
            </div>
          ) : summaryGenerating && !summary ? (
            <div className="p-8 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col items-center text-center gap-4 min-h-[260px] justify-center">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
              </div>
              <div>
                <h4 className="font-medium text-slate-800">Generating summary</h4>
                <p className="text-xs text-slate-400 mt-1">Processing session data...</p>
              </div>
            </div>
          ) : (
            <ToolStatus events={events} isInCall={isInCall} />
          )}
        </div>
      </div>
    </div>
  );
}
