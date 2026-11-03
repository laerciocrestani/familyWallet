import { mkdirSync } from "node:fs"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"
import type { Snapshot } from "../shared/snapshot.ts"

export type StoredSnapshot = {
  id: number
  receivedAt: string
  snapshot: Snapshot
}

export function openDatabase(file: string) {
  if (file !== ":memory:") {
    mkdirSync(path.dirname(file), { recursive: true })
  }
  const db = new DatabaseSync(file)
  db.exec(`
    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY,
      month TEXT NOT NULL,
      as_of TEXT NOT NULL,
      received_at TEXT NOT NULL,
      body TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS snapshots_month ON snapshots(month, id);
  `)
  return db
}

export function insertSnapshot(db: DatabaseSync, snapshot: Snapshot) {
  const receivedAt = new Date().toISOString()
  const result = db
    .prepare(
      `INSERT INTO snapshots (month, as_of, received_at, body)
       VALUES (?, ?, ?, ?)`,
    )
    .run(snapshot.month, snapshot.as_of, receivedAt, JSON.stringify(snapshot))
  return {
    id: Number(result.lastInsertRowid),
    receivedAt,
    month: snapshot.month,
  }
}

export function latestSnapshot(db: DatabaseSync, month: string | null) {
  const row = db
    .prepare(
      `SELECT id, received_at, body
       FROM snapshots
       WHERE (? IS NULL OR month = ?)
       ORDER BY id DESC
       LIMIT 1`,
    )
    .get(month, month) as
    | { id: number; received_at: string; body: string }
    | undefined

  if (!row) return null
  return {
    id: Number(row.id),
    receivedAt: row.received_at,
    snapshot: JSON.parse(row.body) as Snapshot,
  }
}
