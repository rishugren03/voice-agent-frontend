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
  transcript?: TranscriptItem[] | null;
  cost_breakdown: {
    stt_usd: number;
    tts_usd: number;
    llm_usd: number;
    total_usd: number;
  } | null;
  started_at: string;
  ended_at: string | null;
}

export interface TranscriptItem {
  role: "user" | "assistant";
  content: string;
  ts: string;
}

export interface CallSessionRow {
  id: number;
  session_id: string;
  user_id: number | null;
  user_phone: string | null;
  user_name: string | null;
  transcript: TranscriptItem[] | null;
  summary: CallSummary | null;
  cost_breakdown: SessionSummaryResponse["cost_breakdown"];
  started_at: string;
  ended_at: string | null;
}

export interface DashboardStats {
  total_interactions: number;
  completion_rate: number;
  total_leads: number;
  avg_duration_seconds: number;
  last_24h_interactions: number;
}
