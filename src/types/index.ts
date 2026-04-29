export type ToolStatus = "pending" | "done" | "error";

export interface ToolEvent {
  id: string; // client-generated for React key
  type: "tool_call";
  tool: string;
  status: ToolStatus;
  display: string;
  ts: number;
}

export interface CallSummary {
  overview: string;
  appointments: {
    action: string;
    date: string;
    time: string;
    doctor: string;
  }[];
  extracted: {
    name: string | null;
    phone: string | null;
    intent: string;
  };
  preferences: string | null;
  timestamp: string;
}

export interface SessionSummaryResponse {
  session_id: string;
  summary: CallSummary;
  cost_breakdown: {
    stt_usd: number;
    tts_usd: number;
    llm_usd: number;
    total_usd: number;
  } | null;
  started_at: string;
  ended_at: string | null;
}
