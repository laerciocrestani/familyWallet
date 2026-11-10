import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  commitmentLines,
  groupLines,
  linesTotal,
  spendLines,
} from "./box-items.ts"

const spends = [
  { date: "2026-11-06", box: "necessidades", category: "mercado", amount: 106.96, note: "", subbox: "mercado" },
  { date: "2026-11-01", box: "necessidades", category: "mercado", amount: 39.9, note: "Mercado (1º de novembro)", subbox: "mercado" },
  { date: "2026-11-02", box: "desejos", category: "restaurante", amount: 40, note: "jantar" },
]

const commitments = [
  { date: "2026-11-10", name: "Pensão", amount: 1000, box: "necessidades", paid: false, subbox: "familia_educacao" },
  { date: "2026-11-10", name: "Condomínio (média prevista)", amount: 500, box: "necessidades", paid: false, subbox: "moradia" },
  { date: "2026-10-10", name: "Pensão", amount: 1000, box: "necessidades", paid: true },
  { date: "2026-10-15", name: "Seguro da casa", amount: 41.69, box: "necessidades", paid: false },
]

describe("itens do cartão", () => {
  it("lista o gasto da caixinha e soma os lançamentos", () => {
    const lines = spendLines(spends, "necessidades")
    assert.equal(linesTotal(lines), 146.86)
    assert.equal(lines[0]?.name, "Mercado (1º de novembro)")
    assert.equal(lines[0]?.detail, "mercado")
    assert.equal(lines[1]?.name, "mercado")
    assert.equal(spendLines(spends, "desejos")[0]?.name, "jantar")
  })

  it("lista todo comprometido da caixinha, pago e a pagar", () => {
    const lines = commitmentLines(commitments, "necessidades")
    assert.equal(lines.length, 4)
    assert.equal(linesTotal(lines), 2541.69)
    assert.equal(lines.filter((line) => line.paid).length, 1)
  })

  it("filtra a subcaixinha e agrupa o cartão inteiro", () => {
    const moradia = commitmentLines(commitments, "necessidades", "moradia")
    assert.deepEqual(
      moradia.map((line) => line.name),
      ["Condomínio (média prevista)"],
    )
    assert.equal(linesTotal(moradia), 500)
    const groups = groupLines(commitmentLines(commitments.slice(0, 2), "necessidades"))
    assert.deepEqual(
      groups?.map((group) => [group.key, group.total]),
      [
        ["moradia", 500],
        ["familia_educacao", 1000],
      ],
    )
    assert.equal(groupLines(commitmentLines(commitments.slice(2), "necessidades")), null)
  })
})
