import type { CallSessionRow, SessionSummaryResponse } from "@/types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchToken(
  room: string,
  identity: string
): Promise<{ token: string; url: string }> {
  const res = await fetch(`${API}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room, identity }),
  });
  if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchSummary(
  sessionId: string
): Promise<SessionSummaryResponse> {
  const res = await fetch(`${API}/api/session/${sessionId}/summary`);
  if (res.status === 202 || res.status === 404) {
    throw new Error(`Summary pending: ${res.status}`);
  }
  if (!res.ok) throw new Error(`Summary fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchCallSessions(limit = 25): Promise<CallSessionRow[]> {
  try {
    const res = await fetch(`${API}/api/sessions?limit=${limit}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data: { sessions: CallSessionRow[] } = await res.json();
    return data.sessions ?? [];
  } catch {
    return [];
  }
}

export async function fetchTavusUrl(
  sessionId: string
): Promise<{ conversation_id: string; conversation_url: string }> {
  const res = await fetch(
    `${API}/api/tavus/conversation?session_id=${encodeURIComponent(sessionId)}`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error(`Tavus conversation failed: ${res.status}`);
  return res.json();
}

export async function endTavusConversation(conversationId: string): Promise<void> {
  await fetch(`${API}/api/tavus/conversation/${conversationId}`, { method: "DELETE" });
}

export async function endTavusConversationForSession(
  conversationId: string,
  sessionId: string
): Promise<void> {
  await fetch(
    `${API}/api/tavus/conversation/${conversationId}?session_id=${encodeURIComponent(sessionId)}`,
    { method: "DELETE" }
  );
}

export async function executeToolCall(
  sessionId: string,
  tool: string,
  argumentsPayload: Record<string, unknown>
): Promise<{ tool: string; status: "done" | "error"; display: string; result: unknown }> {
  const res = await fetch(`${API}/api/session/${sessionId}/tool-call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, arguments: argumentsPayload }),
  });
  if (!res.ok) throw new Error(`Tool call failed: ${res.status}`);
  return res.json();
}

export async function finishSession(sessionId: string, transcript: unknown[] = []): Promise<void> {
  await fetch(`${API}/api/session/${sessionId}/finish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });
}

export async function fetchDashboardStats(): Promise<import("@/types").DashboardStats | null> {
  try {
    const res = await fetch(`${API}/api/analytics/stats`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
