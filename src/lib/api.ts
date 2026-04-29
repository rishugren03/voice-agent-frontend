import type { SessionSummaryResponse } from "@/types";

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
  if (!res.ok) throw new Error(`Summary fetch failed: ${res.status}`);
  return res.json();
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
