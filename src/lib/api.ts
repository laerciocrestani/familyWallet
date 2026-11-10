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

export type RangeResult =
  | { kind: "ok"; snapshots: SnapshotResponse[] }
  | { kind: "empty" }
  | { kind: "unauthorized" }
  | { kind: "error" }

export async function fetchSnapshot(token: string): Promise<SnapshotResult> {
  return readSnapshot(token, "/api/aurum/snapshot")
}

export async function fetchRange(
  token: string,
  from: string,
  to: string,
): Promise<RangeResult> {
  const params = new URLSearchParams({ from, to })
  let response: Response
  try {
    response = await fetch(`/api/aurum/snapshot?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    return { kind: "error" }
  }
  if (response.status === 401) return { kind: "unauthorized" }
  if (response.status === 404) return { kind: "empty" }
  if (!response.ok) return { kind: "error" }
  const body = (await response.json()) as { snapshots: SnapshotResponse[] }
  return { kind: "ok", snapshots: body.snapshots }
}

async function readSnapshot(token: string, path: string): Promise<SnapshotResult> {
  let response: Response
  try {
    response = await fetch(path, {
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
