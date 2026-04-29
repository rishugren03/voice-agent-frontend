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
  Sparkles
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

    if (eventType === "conversation.replica.started_speaking") {
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
      let args = props.arguments ?? fn.arguments ?? {};
      
      // Defensive parsing for stringified arguments (common in LLM tool calling)
      if (typeof args === "string") {
        try {
          args = JSON.parse(args);
        } catch {
          console.warn("Failed to parse tool arguments:", args);
          args = {};
        }
      }

      if (typeof tool !== "string" || !sessionIdRef.current) return;

      addEventRef.current?.({
        id: `${tool}-${Date.now()}-pending`,
        type: "tool_call", tool, status: "pending",
        display: tool === "end_conversation" ? "Generating summary..." : "Running action...",
        ts: Date.now(),
      });

      executeToolCall(sessionIdRef.current, tool, args as Record<string, unknown>)
        .then((result) => {
          addEventRef.current?.({
            id: `${tool}-${Date.now()}-done`,
            type: "tool_call", tool, status: result.status, display: result.display,
            ts: Date.now(),
          });
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
        finishSession(sid, transcript)
          .then(() => handleSummaryReady(sid))
          .catch(() => handleSummaryReady(sid));
      } else {
        setTimeout(() => handleSummaryReady(sid), 6000);
      }
    }
  }

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.action === "joined-meeting" && dailyCallRef.current) {
        iframeJoinedRef.current = true;
        dailyCallRef.current.sendAppMessage({
          message_type: "conversation",
          event_type: "conversation.echo",
          conversation_id: tavusConvIdRef.current,
          properties: { text: GREETING },
        }, "*");
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
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }

  const isInCall = callState === "connecting" || callState === "connected";

  return (
    <div className="space-y-10 py-4 animate-slide-up-fade">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-400">
                <Sparkles className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Active Session</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white leading-none">Live <span className="text-indigo-500">Session</span></h1>
            <p className="text-muted-foreground text-sm max-w-md">Interacting with Maya, your healthcare specialist.</p>
        </div>

        {callState === "connected" && (
            <div className="flex items-center gap-6 p-4 rounded-2xl glass-panel">
                <div className="flex flex-col">
                    <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider">Duration</p>
                    <p className="text-2xl font-mono font-bold text-indigo-400 mt-1">{formatDuration(callDuration)}</p>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="flex items-center gap-3 pr-2">
                    <div className={cn(
                        "w-4 h-4 rounded-full transition-all duration-500 border-2 border-slate-900 shadow-md",
                        isSpeaking 
                          ? "bg-emerald-400 shadow-emerald-500/20" 
                          : "bg-slate-700"
                    )} />
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-white leading-none">{isSpeaking ? "Maya Speaking" : "Maya Listening"}</span>
                        <span className="text-[9px] text-muted-foreground mt-1 uppercase">Connection Stable</span>
                    </div>
                </div>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* Left Column: Avatar & Controls */}
        <div className="lg:col-span-8 group relative">
          <div className="relative aspect-video bg-slate-950 rounded-3xl overflow-hidden border border-white/[0.08] shadow-lg z-0">
            
            {/* Overlay for connecting/ended states */}
            {callState !== "connected" && !tavusUrl && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md">
                    {callState === "connecting" ? (
                        <div className="flex flex-col items-center gap-8">
                            <div className="relative">
                                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-xl font-bold text-white">Connecting...</h3>
                                <p className="text-muted-foreground text-sm font-medium">Preparing your session with Maya.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-8 px-12 text-center">
                            <div className="w-24 h-24 rounded-3xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-center shadow-2xl relative overflow-hidden group/icon">
                                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 opacity-0 group-hover/icon:opacity-100 transition-opacity" />
                                <Headphones className="w-12 h-12 text-muted-foreground group-hover/icon:text-primary transition-colors" />
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-2xl font-bold text-white">
                                    {callState === "ended" ? "Session Concluded" : "Maya is Offline"}
                                </h3>
                                <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
                                    {callState === "ended" 
                                      ? `Last session lasted ${formatDuration(frozenDuration)}. Intelligence reports are being synchronized.` 
                                      : "Deploy Maya to handle patient inquiries, schedule appointments, and manage healthcare tasks."}
                                </p>
                            </div>
                            <button 
                                onClick={startCall}
                                className="bg-primary hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-1 active:translate-y-0.5 flex items-center gap-3 group/btn"
                            >
                                <Activity className="w-5 h-5 group-hover/btn:animate-pulse" />
                                {callState === "ended" ? "Launch New Session" : "Deploy Maya Agent"}
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
                title="Maya Avatar Stream"
              />
            )}
            
            {/* Viewport status overlay */}
            {callState === "connected" && (
                <div className="absolute top-4 left-4 z-20 pointer-events-none">
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase">Live</span>
                    </div>
                </div>
            )}
          </div>

          {/* Control Bar */}
          {callState === "connected" && (
              <div className="mt-8 flex items-center justify-between p-4 glass-panel rounded-2xl z-10 relative">
                  <div className="flex items-center gap-3">
                      <button className="p-3.5 rounded-xl bg-white/[0.03] text-muted-foreground hover:bg-indigo-500/10 hover:text-indigo-400 transition-all border border-white/5 active:scale-95">
                          <Mic className="w-5 h-5" />
                      </button>
                      <button className="p-3.5 rounded-xl bg-white/[0.03] text-muted-foreground hover:bg-indigo-500/10 hover:text-indigo-400 transition-all border border-white/5 active:scale-95">
                          <Settings className="w-5 h-5" />
                      </button>
                  </div>
                  <button 
                    onClick={endCall}
                    className="bg-red-500 hover:bg-red-600 text-white px-8 py-3.5 rounded-xl font-bold transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-red-500/10"
                  >
                    <PhoneOff className="w-5 h-5" />
                    End Session
                  </button>
              </div>
          )}
        </div>

        {/* Right Column: Intelligence & Status */}
        <div className="lg:col-span-4 space-y-10">
            {callState === "ended" && summary ? (
                <div className="space-y-6 animate-slide-up-fade">
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Session Summary</h3>
                    </div>
                    <CallDetails summary={summary.summary} cost_breakdown={summary.cost_breakdown} />
                    
                    <button 
                        onClick={startCall}
                        className="w-full py-4 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-2xl text-[10px] font-bold tracking-[0.2em] text-indigo-400 uppercase transition-all flex items-center justify-center gap-3 group"
                    >
                        <Phone className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Initialize New Session
                    </button>
                </div>
            ) : summaryGenerating && !summary ? (
                <div className="p-10 rounded-3xl glass-panel flex flex-col items-center text-center gap-6 relative overflow-hidden h-full min-h-[400px] justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center animate-pulse">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-bold text-lg text-white">Generating Summary</h4>
                        <p className="text-muted-foreground text-xs leading-relaxed max-w-[220px] mx-auto">Processing session data and finalizing report...</p>
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
