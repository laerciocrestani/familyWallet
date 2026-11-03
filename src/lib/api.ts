import type { Snapshot } from "../../shared/snapshot.ts"

export const TOKEN_KEY = "family-wallet-token"

export type SnapshotResponse = {
  id: number
  received_at: string
  snapshot: Snapshot
}

export type SnapshotResult =
  | { kind: "ok"; body: SnapshotResponse }
  | { kind: "empty" }
  | { kind: "unauthorized" }
  | { kind: "error" }

export async function fetchSnapshot(token: string): Promise<SnapshotResult> {
  let response: Response
  try {
    response = await fetch("/api/aurum/snapshot", {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    return { kind: "error" }
  }
  if (response.status === 401) return { kind: "unauthorized" }
  if (response.status === 404) return { kind: "empty" }
  if (!response.ok) return { kind: "error" }
  return { kind: "ok", body: (await response.json()) as SnapshotResponse }
}
