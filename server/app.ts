import { timingSafeEqual } from "node:crypto"
import { serveStatic } from "@hono/node-server/serve-static"
import { Hono } from "hono"
import type { DatabaseSync } from "node:sqlite"
import { snapshotIssues, snapshotSchema } from "../shared/snapshot.ts"
import { insertSnapshot, latestSnapshot } from "./db.ts"

const MAX_BODY = 1_000_000

export function createApp(options: {
  token: string
  db: DatabaseSync
  serveClient?: boolean
}) {
  const app = new Hono()

  app.get("/api/health", (c) => c.json({ ok: true }))

  app.use("/api/aurum/*", async (c, next) => {
    const header = c.req.header("authorization") ?? ""
    const expected = `Bearer ${options.token}`
    const left = Buffer.from(header)
    const right = Buffer.from(expected)
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      return c.json({ error: "unauthorized" }, 401)
    }
    await next()
  })

  app.post("/api/aurum/snapshot", async (c) => {
    const declared = Number(c.req.header("content-length") ?? 0)
    if (declared > MAX_BODY) {
      return c.json({ error: "too_large" }, 413)
    }

    let body: unknown
    try {
      body = await c.req.json()
    } catch {
      return c.json(
        { error: "invalid", issues: [{ path: "", message: "JSON inválido" }] },
        400,
      )
    }

    const parsed = snapshotSchema.safeParse(body)
    if (!parsed.success) {
      return c.json(
        { error: "invalid", issues: snapshotIssues(parsed.error) },
        400,
      )
    }
    if (!parsed.data.as_of.startsWith(parsed.data.month)) {
      return c.json(
        {
          error: "invalid",
          issues: [
            { path: "as_of", message: "as_of precisa estar dentro de month" },
          ],
        },
        400,
      )
    }

    const saved = insertSnapshot(options.db, parsed.data)
    return c.json(saved, 201)
  })

  app.get("/api/aurum/snapshot", (c) => {
    const month = c.req.query("month")
    if (month !== undefined && !/^\d{4}-\d{2}$/.test(month)) {
      return c.json(
        {
          error: "invalid",
          issues: [{ path: "month", message: "use AAAA-MM" }],
        },
        400,
      )
    }
    const stored = latestSnapshot(options.db, month ?? null)
    if (!stored) return c.json({ error: "empty" }, 404)
    return c.json({
      id: stored.id,
      received_at: stored.receivedAt,
      snapshot: stored.snapshot,
    })
  })

  if (options.serveClient) {
    app.use("*", serveStatic({ root: "./dist" }))
    app.get("*", serveStatic({ path: "./dist/index.html" }))
  }

  return app
}
