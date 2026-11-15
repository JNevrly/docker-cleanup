import type { Snapshot } from "./types";

// Older histories have no connection capability. Keep local upgrade matching,
// but never authorize follow-up using daemon ID alone.
export function connectionIdentity(snapshot: Snapshot): string {
  return JSON.stringify([
    snapshot.daemonId,
    snapshot.endpoint,
    snapshot.capabilities.connection ??
      JSON.stringify([
        snapshot.endpoint,
        snapshot.capabilities.target ?? snapshot.endpoint,
      ]),
  ]);
}
