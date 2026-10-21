import { uiText } from "./messages.ts";
export type ServerStateKey = "ddls" | "sessions" | "messages" | "notes";

export type ServerState = Record<ServerStateKey, unknown[]>;

export async function loadServerState(): Promise<ServerState> {
  const response = await fetch("/api/state", { cache: "no-store" });
  if (!response.ok) throw new Error(uiText("server.185184804da0", { value0: response.status }));
  return response.json() as Promise<ServerState>;
}

export async function saveServerState(key: ServerStateKey, value: unknown[]): Promise<void> {
  const response = await fetch("/api/state", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key, value }),
  });
  if (!response.ok) throw new Error(uiText("server.ae2d20f3cb25", { value0: response.status }));
}
