"use client";

import { useEffect, useReducer } from "react";
import { Room, RoomEvent } from "livekit-client";
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

export function useToolFeed(
  room: Room | null,
  onSummaryReady: (sessionId: string) => void
) {
  const [events, dispatch] = useReducer(reducer, []);

  useEffect(() => {
    if (!room) return;

    function onData(payload: Uint8Array) {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload));

        if (msg.type === "tool_call") {
          dispatch({
            type: "UPSERT",
            event: {
              id: `${msg.tool}-${Date.now()}`,
              type: "tool_call",
              tool: msg.tool,
              status: msg.status,
              display: msg.display,
              ts: Date.now(),
            },
          });
        } else if (msg.type === "summary_ready") {
          onSummaryReady(msg.session_id);
        }
      } catch {
        // malformed message — ignore
      }
    }

    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room, onSummaryReady]);

  return {
    events,
    addEvent: (event: ToolEvent) => dispatch({ type: "UPSERT", event }),
    clearEvents: () => dispatch({ type: "CLEAR" }),
  };
}
