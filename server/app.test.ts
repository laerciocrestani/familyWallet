import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { Snapshot } from "../shared/snapshot.ts"
import { createApp } from "./app.ts"
import { openDatabase } from "./db.ts"

const token = "test-token"

function sample(month = "2026-11"): Snapshot {
  return {
    as_of: `${month}-03`,
    month,
    income: { expected: 1000, received: 400 },
    boxes: [
      {
        id: "necessidades",
        ceiling: 800,
        spent: 200,
        free: 600,
        projected_over: 0,
        weekly: { budget: 200, spent: 50 },
      },
      { id: "desejos", ceiling: 150, spent: 20, free: 130 },
      {
        id: "futuro",
        ceiling: 50,
        allocated: 0,
        children: [{ id: "reserva", planned: 50, done: 0 }],
      },
    ],
    commitments: [
      {
        date: `${month}-10`,
        name: "condominio",
        amount: 100,
        box: "necessidades",
        paid: false,
      },
    ],
    cards: [
      {
        name: "Inter",
        closing_day: 1,
        due_day: 8,
        statement: 80,
        installments_open: [{ description: "mercado", amount: 40, remaining: 2 }],
      },
    ],
    transactions: [
      {
        date: `${month}-03`,
        box: "necessidades",
        category: "mercado",
        amount: 42.5,
        note: "feira",
      },
    ],
  }
}

function app() {
  return createApp({ token, db: openDatabase(":memory:") })
}

function auth(value = token) {
  return { authorization: `Bearer ${value}` }
}

describe("snapshot API", () => {
  it("recusa leitura sem token", async () => {
    const res = await app().request("/api/aurum/snapshot")
    assert.equal(res.status, 401)
  })

  it("responde saúde sem token", async () => {
    const res = await app().request("/api/health")
    assert.equal(res.status, 200)
    assert.deepEqual(await res.json(), { ok: true })
  })

  it("guarda o retrato e devolve o mais recente do mês", async () => {
    const api = app()
    const created = await api.request("/api/aurum/snapshot", {
      method: "POST",
      headers: { ...auth(), "content-type": "application/json" },
      body: JSON.stringify(sample()),
    })
    assert.equal(created.status, 201)

    const later = sample()
    later.income.received = 900
    const second = await api.request("/api/aurum/snapshot", {
      method: "POST",
      headers: { ...auth(), "content-type": "application/json" },
      body: JSON.stringify({ ...later, origem: "aurum" }),
    })
    assert.equal(second.status, 201)

    const res = await api.request("/api/aurum/snapshot?month=2026-11", {
      headers: auth(),
    })
    assert.equal(res.status, 200)
    const body = (await res.json()) as {
      snapshot: Snapshot & { origem?: string }
    }
    assert.equal(body.snapshot.income.received, 900)
    assert.equal(body.snapshot.origem, "aurum")
  })

  it("devolve vazio quando ainda não há envio", async () => {
    const res = await app().request("/api/aurum/snapshot", { headers: auth() })
    assert.equal(res.status, 404)
  })

  it("rejeita as_of fora do mês", async () => {
    const broken = sample()
    broken.as_of = "2026-10-31"
    const res = await app().request("/api/aurum/snapshot", {
      method: "POST",
      headers: { ...auth(), "content-type": "application/json" },
      body: JSON.stringify(broken),
    })
    assert.equal(res.status, 400)
  })
})
