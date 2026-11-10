import path from "node:path"
import { serve } from "@hono/node-server"
import { createApp } from "./app.ts"
import { openDatabase } from "./db.ts"

const token = process.env.AURUM_TOKEN?.trim()
if (!token) {
  console.error("Defina AURUM_TOKEN no ambiente ou no arquivo .env.")
  process.exit(1)
}

const dataDir = process.env.DATA_DIR?.trim() || "data"
const port = Number(process.env.PORT || 8788)
const host = process.env.HOST?.trim() || "127.0.0.1"
const db = openDatabase(path.join(dataDir, "family.sqlite"))
const app = createApp({
  token,
  db,
  serveClient: process.env.NODE_ENV === "production",
})

serve({ fetch: app.fetch, hostname: host, port }, (info) => {
  console.log(`Family Wallet em http://${info.address}:${info.port}`)
})
