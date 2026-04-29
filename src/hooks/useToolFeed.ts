"use client";

import { useReducer } from "react";
import type { ToolEvent } from "@/types";

type Action =
  | { type: "UPSERT"; event: ToolEvent }
  | { type: "CLEAR" };

function reducer(state: ToolEvent[], action: Action): ToolEvent[] {
  switch (action.type) {
    case "UPSERT": {
      const { event } = action;
      // If a "done" or "error" event arrives, find the matching pending entry and update it in-place.
      if (event.status !== "pending") {
        const idx = state.findIndex(
          (e) => e.tool === event.tool && e.status === "pending"
        );
        if (idx !== -1) {
          const updated = [...state];
          updated[idx] = { ...updated[idx], status: event.status, display: event.display };
          return updated;
        }
      }
      // New event (pending, or done with no prior pending): prepend, cap at 20.
      return [event, ...state].slice(0, 20);
    }
    case "CLEAR":
      return [];
  }
}

export function useToolFeed(onSummaryReady: (sessionId: string) => void) {
  const [events, dispatch] = useReducer(reducer, []);

  // Tool events arrive via Tavus postMessage → addEvent() in call/page.tsx.
  // No LiveKit data channel needed; Tavus CVI is the sole conversation pipeline.
  void onSummaryReady; // consumed by the call page directly

  return {
    events,
    addEvent: (event: ToolEvent) => dispatch({ type: "UPSERT", event }),
    clearEvents: () => dispatch({ type: "CLEAR" }),
  };
}
