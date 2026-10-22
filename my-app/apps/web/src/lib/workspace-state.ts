import { getDb } from "./db";
import { loadServerState, saveServerState, type ServerState } from "./server-state";
import { createStateSync, type PendingState } from "./state-sync";

const keys = ["ddls", "sessions", "messages", "notes"] as const;
export const workspaceState = createStateSync({
  async read() {
    const db = getDb();
    return Object.fromEntries(await Promise.all(keys.map(async key => [key, await db.table(key).toArray()]))) as ServerState;
  },
  async pending() { return getDb().stateOutbox.toArray(); },
  async stage(row: PendingState) {
    const db = getDb(), table = db.table(row.key);
    await db.transaction("rw", table, db.stateOutbox, async () => {
      await table.clear(); if (row.value.length) await table.bulkPut(row.value);
      await db.stateOutbox.put(row);
    });
  },
  async acknowledge(row: PendingState) {
    const db = getDb();
    await db.transaction("rw", db.stateOutbox, async () => {
      if ((await db.stateOutbox.get(row.key))?.revision === row.revision) await db.stateOutbox.delete(row.key);
    });
  },
}, { read: loadServerState, save: saveServerState }, {
  onStatus(status) { if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("butler:state-sync", { detail: status })); },
});
