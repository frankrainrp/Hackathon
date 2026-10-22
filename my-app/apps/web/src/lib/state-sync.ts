import type { ServerState, ServerStateKey } from "./server-state.ts";

export type PendingState = { key: ServerStateKey; value: unknown[]; revision: string };
export type SyncStatus = "saved" | "pending" | "offline" | "error";
type Store = {
  read(): Promise<ServerState>;
  pending(): Promise<PendingState[]>;
  stage(row: PendingState): Promise<void>;
  acknowledge(row: PendingState): Promise<void>;
};

/** Durable local edits precede HTTP. Only one request may write a snapshot at a time. */
export function createStateSync(store: Store, remote: { read(): Promise<ServerState>; save(key: ServerStateKey, value: unknown[]): Promise<void> }, options: { delayMs?: number; onStatus?: (status: SyncStatus) => void } = {}) {
  let localQueue = Promise.resolve(), networkQueue = Promise.resolve();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let flushing: Promise<void> | undefined, stopped = false;
  let loading: Promise<ServerState> | undefined;
  const status = (value: SyncStatus) => options.onStatus?.(value);
  const send = (row: PendingState) => {
    const next = networkQueue.catch(() => {}).then(() => remote.save(row.key, row.value));
    networkQueue = next.catch(() => {}); return next;
  };
  const schedule = (ms = options.delayMs ?? 750) => {
    if (stopped) return;
    clearTimeout(timer); timer = setTimeout(() => { void flush(); }, ms);
    timer.unref?.();
  };
  function load() {
    if (loading) return loading;
    loading = (async () => {
      const state = await remote.read().catch(() => { status("offline"); return store.read(); });
      // Keep the outbox until hydration has overlaid it on the server snapshot.
      const pending = await store.pending().catch(() => []);
      for (const row of pending) state[row.key] = row.value;
      return state;
    })().finally(() => { loading = undefined; });
    return loading;
  }
  async function save(key: ServerStateKey, value: unknown[]) {
    const row = { key, value: structuredClone(value), revision: crypto.randomUUID() };
    const next = localQueue.catch(() => {}).then(async () => {
      try { await store.stage(row); status("pending"); schedule(); }
      catch {
        // A browser with unavailable IndexedDB can still save to a healthy server.
        try {
          await send(row);
          for (const old of await store.pending().catch(() => [])) if (old.key === key) await store.acknowledge(old);
          status("saved");
        }
        catch (error) { status("error"); throw error; }
      }
    });
    localQueue = next.catch(() => {}); return next;
  }
  async function flush() {
    if (flushing) return flushing;
    clearTimeout(timer);
    flushing = (async () => {
      await loading?.catch(() => {});
      await localQueue;
      try {
        for (const row of await store.pending()) { await send(row); await store.acknowledge(row); }
        if ((await store.pending()).length) { status("pending"); schedule(); }
        else status("saved");
      } catch { status("offline"); schedule(10000); }
    })().finally(() => { flushing = undefined; });
    return flushing;
  }
  return { load, save, flush, start() { stopped = false; }, stop() { stopped = true; clearTimeout(timer); } };
}
