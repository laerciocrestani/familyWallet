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
        installments_open: [
          { description: "mercado", amount: 40, index: 3, count: 6 },
          { description: "sofá", amount: 90, index: 6, count: 6 },
        ],
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

  it("devolve cada mês do período, o retrato mais recente", async () => {
    const api = app()
    const headers = { ...auth(), "content-type": "application/json" }
    await api.request("/api/aurum/snapshot", {
      method: "POST",
      headers,
      body: JSON.stringify(sample("2026-10")),
    })
    const november = sample("2026-11")
    november.income.received = 100
    await api.request("/api/aurum/snapshot", {
      method: "POST",
      headers,
      body: JSON.stringify(november),
    })
    november.income.received = 250
    await api.request("/api/aurum/snapshot", {
      method: "POST",
      headers,
      body: JSON.stringify(november),
    })
    await api.request("/api/aurum/snapshot", {
      method: "POST",
      headers,
      body: JSON.stringify(sample("2026-12")),
    })

    const res = await api.request(
      "/api/aurum/snapshot?from=2026-11-02&to=2026-12-01",
      { headers: auth() },
    )
    assert.equal(res.status, 200)
    const body = (await res.json()) as {
      snapshots: { snapshot: Snapshot }[]
    }
    assert.deepEqual(
      body.snapshots.map((item) => item.snapshot.month),
      ["2026-11", "2026-12"],
    )
    assert.equal(body.snapshots[0]?.snapshot.income.received, 250)
    const card = body.snapshots[0]?.snapshot.cards[0]
    assert.equal(card?.installments_open?.[1]?.index, 6)
    assert.equal(card?.installments_open?.[1]?.count, 6)
  })

  it("rejeita período invertido", async () => {
    const res = await app().request(
      "/api/aurum/snapshot?from=2026-12-01&to=2026-11-01",
      { headers: auth() },
    )
    assert.equal(res.status, 400)
  })

  it("guarda o retrato de quatro caixinhas sem recalcular o teto", async () => {
    const api = app()
    const payload = {
      as_of: "2026-11-09",
      month: "2026-11",
      income: {
        expected: 17000,
        received: 0,
        sources: [
          {
            name: "salário",
            amount: 17000,
            expected_date: "2026-11-05",
            received: false,
            note: "previsto",
          },
        ],
      },
      boxes: [
        {
          id: "necessidades",
          ceiling: 11900,
          spent: 146.86,
          committed: 8397.57,
          free: 3355.57,
          projected_over: 0,
          weekly: {
            budget: 2767.44,
            spent: 0,
            week_start: "2026-11-09",
            week_end: "2026-11-15",
          },
          subboxes: [
            {
              key: "moradia",
              name: "Moradia",
              ceiling: 3400,
              committed: 3292.14,
              spent: 0,
              free: 107.86,
            },
          ],
        },
        {
          id: "desejos",
          ceiling: 2550,
          spent: 0,
          committed: 2533.89,
          free: 16.11,
          projected_over: 0,
        },
        {
          id: "seguranca",
          ceiling: 1020,
          allocated: 0,
          free: 1020,
          children: [
            { id: "emergencia", planned: 400, done: 0 },
            { id: "despesas_anuais", planned: 400, done: 0 },
            { id: "manutencao", planned: 220, done: 0 },
          ],
        },
        {
          id: "futuro",
          ceiling: 1530,
          allocated: 0,
          free: 1530,
          children: [{ id: "amortizacao_apto", planned: 1530, done: 0 }],
        },
      ],
      commitments: [
        {
          date: "2026-11-10",
          name: "aluguel",
          amount: 2500,
          box: "necessidades",
          paid: false,
          subbox: "moradia",
          date_approx: true,
        },
      ],
      cards: [
        {
          name: "Inter",
          closing_day: 1,
          due_day: 8,
          statement: 80,
          limit: 5000,
        },
      ],
      transactions: [
        {
          date: "2026-11-03",
          box: "necessidades",
          category: "mercado",
          amount: 42.5,
          note: "feira",
          subbox: "mercado",
        },
      ],
      notes: "conferir a tela",
      model: {
        name: "modelo 4 caixinhas",
        since: "2026-11",
        income_reference: 17000,
        income: 17000,
        percentages: {
          necessidades: 0.7,
          desejos: 0.15,
          seguranca: 0.06,
          futuro: 0.09,
        },
        ceilings: {
          necessidades: 11900,
          desejos: 2550,
          seguranca: 1020,
          futuro: 1530,
        },
      },
      extra: { ignored: true },
    }
    const created = await api.request("/api/aurum/snapshot", {
      method: "POST",
      headers: { ...auth(), "content-type": "application/json" },
      body: JSON.stringify(payload),
    })
    assert.equal(created.status, 201)

    const res = await api.request("/api/aurum/snapshot?month=2026-11", {
      headers: auth(),
    })
    assert.equal(res.status, 200)
    const body = (await res.json()) as { snapshot: Snapshot & { extra?: unknown } }
    const necessidades = body.snapshot.boxes.find((box) => box.id === "necessidades")
    assert.equal(necessidades?.committed, 8397.57)
    assert.equal(necessidades?.subboxes?.[0]?.key, "moradia")
    assert.equal(body.snapshot.boxes.some((box) => box.id === "seguranca"), true)
    assert.equal(body.snapshot.model?.name, "modelo 4 caixinhas")
    assert.equal(body.snapshot.model?.ceilings?.futuro, 1530)
    assert.equal(body.snapshot.income.sources?.[0]?.received, false)
    assert.equal(body.snapshot.notes, "conferir a tela")

    const withObjectNotes = {
      ...payload,
      as_of: "2026-11-09",
      notes: { source: "aurum", pending_checks: ["ok"] },
    }
    const objectNotes = await api.request("/api/aurum/snapshot", {
      method: "POST",
      headers: { ...auth(), "content-type": "application/json" },
      body: JSON.stringify(withObjectNotes),
    })
    assert.equal(objectNotes.status, 201)
    const again = await api.request("/api/aurum/snapshot?month=2026-11", {
      headers: auth(),
    })
    const stored = (await again.json()) as { snapshot: { notes?: unknown } }
    assert.deepEqual(stored.snapshot.notes, withObjectNotes.notes)
    assert.equal(body.snapshot.cards[0]?.limit, 5000)
    assert.equal(body.snapshot.commitments[0]?.subbox, "moradia")
    assert.equal(body.snapshot.commitments[0]?.date_approx, true)
    assert.equal(body.snapshot.transactions[0]?.subbox, "mercado")
    assert.deepEqual(body.snapshot.extra, { ignored: true })
    assert.equal(body.snapshot.boxes[0]?.ceiling, 11900)
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
