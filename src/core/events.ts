import type { AgentId, StudioEvent } from "./types";

export type EventSink = (e: StudioEvent) => void;

export function makeEvent(level: StudioEvent["level"], message: string, agent?: AgentId | "orchestrator"): StudioEvent {
  return { at: new Date().toISOString(), level, agent, message };
}
