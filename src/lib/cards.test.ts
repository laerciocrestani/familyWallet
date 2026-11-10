import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { cardMonthTotals, projectCards, projectionMonths } from "./cards.ts"

const samsung = {
  amount: 212.28,
  installment: "1/9",
  last_month_in_projection: "2027-03",
}
const mapfre = {
  amount: 205.73,
  installment: "1/7",
  last_month_in_projection: "2027-03",
}
const ftd = {
  amount: 204.77,
  installment: "1/2",
  last_month_in_projection: "2026-11",
}
const meli = {
  amount: 19.9,
  installment: "1/6",
  last_month_in_projection: "2026-10",
}

describe("projeção dos cartões", () => {
  it("em outubro inclui o mês visto e os seis seguintes", () => {
    assert.deepEqual(projectionMonths("2026-10"), [
      "2026-10",
      "2026-11",
      "2026-12",
      "2027-01",
      "2027-02",
      "2027-03",
      "2027-04",
    ])
  })

  it("voltar a outubro repete a mesma janela", () => {
    assert.deepEqual(projectionMonths("2026-10"), projectionMonths("2026-10"))
    assert.equal(projectionMonths("2026-11")[0], "2026-11")
    assert.equal(projectionMonths("2026-11")[6], "2027-05")
  })

  it("segue a contagem da parcela além do horizonte antigo", () => {
    const { rows, series } = projectCards(
      [
        {
          name: "C6",
          installments_open: [mapfre, { amount: 149.88, installment: "1/1" }],
          recurring: [{ amount: 33.4 }],
        },
      ],
      "2026-10",
    )
    assert.equal(series[0]?.label, "C6")
    assert.equal(rows[0]?.label, "Out/26")
    assert.equal(rows[6]?.label, "Abr/27")
    assert.equal(rows[0]?.c6, 389.01)
    assert.equal(rows[1]?.c6, 239.13)
    assert.equal(rows[6]?.c6, 239.13)
  })

  it("inclui a parcela do mês visto e deixa a encerrada fora dos seguintes", () => {
    const { rows } = projectCards(
      [
        {
          name: "Inter",
          installments_open: [samsung, ftd, meli],
        },
      ],
      "2026-10",
    )
    assert.equal(rows[0]?.inter, 436.95)
    assert.equal(rows[1]?.inter, 417.05)
    assert.equal(rows[2]?.inter, 212.28)
    assert.equal(rows[6]?.inter, 212.28)
  })

  it("soma todos os cartões em cada mês", () => {
    const { rows, series } = projectCards(
      [
        {
          name: "C6",
          installments_open: [mapfre, { amount: 149.88, installment: "1/1" }],
          recurring: [{ amount: 33.4 }],
        },
        { name: "Inter", installments_open: [samsung, ftd, meli] },
      ],
      "2026-10",
    )
    const totals = cardMonthTotals(rows, series)
    assert.equal(totals[0]?.label, "Out/26")
    assert.equal(totals[0]?.total, 825.96)
    assert.equal(totals[1]?.total, 656.18)
    assert.equal(totals[2]?.total, 451.41)
    assert.equal(totals[6]?.total, 451.41)
  })

  it("em novembro a parcela 2/2 entra só no mês visto", () => {
    const { rows } = projectCards(
      [
        {
          name: "Nubank",
          installments_open: [{ amount: 290, installment: "2/2" }],
        },
      ],
      "2026-11",
    )
    assert.equal(rows[0]?.month, "2026-11")
    assert.equal(rows[0]?.nubank, 290)
    assert.equal(rows.slice(1).every((row) => row.nubank == null), true)
  })
})
