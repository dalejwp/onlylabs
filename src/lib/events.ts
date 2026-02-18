import { EventEmitter } from "events";

const globalForEvents = globalThis as unknown as { mcBus?: EventEmitter };

export const mcBus = globalForEvents.mcBus ?? new EventEmitter();
mcBus.setMaxListeners(1000);

if (process.env.NODE_ENV !== "production") globalForEvents.mcBus = mcBus;

export type McEvent =
  | { type: "task.created"; taskId: string }
  | { type: "task.moved"; taskId: string; to: string }
  | { type: "task.updated"; taskId: string };

export function emitEvent(evt: McEvent) {
  mcBus.emit("event", evt);
}
