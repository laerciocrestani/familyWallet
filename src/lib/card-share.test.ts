import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isFamilyCard, isGrocery, statementShare } from "./card-share.ts"
import { projectSharedCards } from "./cards.ts"

const c6Lines = [
  { description: "MAPFRE", amount: 205.73, box: "necessidades" },
  { description: "Havan", amount: 194.57, box: "desejos" },
  { description: "Overup Gym", amount: 149.9, box: "desejos" },
  { description: "Cartão de Todos", amount: 33.4, box: "necessidades" },
]

describe("rateio do C6", () => {
  it("reconhece o C6 e não o Mercado Pago", () => {
    assert.equal(isFamilyCard("C6 virtual 7911"), true)
    assert.equal(isFamilyCard("Mercado Pago"), false)
  })

  it("trata mercado e supermercado como despesa rateada", () => {
    assert.equal(isGrocery({ amount: 1, description: "Supermercado" }), true)
    assert.equal(isGrocery({ amount: 1, category: "mercado" }), true)
    assert.equal(isGrocery({ amount: 1, description: "MAPFRE" }), false)
  })

  it("sem mercado a fatura inteira é sua e separa necessidades do resto", () => {
    const share = statementShare(c6Lines, 583.6)
    assert.equal(share.bank, 583.6)
    assert.equal(share.grocery, 0)
    assert.equal(share.family, 0)
    assert.equal(share.mine, 583.6)
    assert.equal(share.mineNecessidades, 239.13)
    assert.equal(share.mineOther, 344.47)
  })

  it("metade do mercado entra na sua autoria em necessidades", () => {
    const share = statementShare(
      [...c6Lines, { description: "Mercado", amount: 80.11, category: "mercado" }],
      663.71,
    )
    assert.equal(share.grocery, 80.11)
    assert.equal(share.family, 40.05)
    assert.equal(share.mine, 623.66)
    assert.equal(share.mineNecessidades, 279.19)
    assert.equal(share.mineOther, 344.47)
    assert.equal(
      Math.round((share.mineNecessidades + share.mineOther + share.family) * 100),
      66371,
    )
  })

  it("o que a fatura não detalha continua seu e não vai para a família", () => {
    const share = statementShare(c6Lines, 600)
    assert.equal(share.family, 0)
    assert.equal(share.mine, 600)
    assert.equal(share.mineOther, 360.87)
  })

  it("no gráfico a família só aparece quando há mercado no C6", () => {
    const once = c6Lines.map((line) => ({ ...line, installment: "1/1" }))
    const plain = projectSharedCards(
      [{ name: "C6 virtual 7911", installments_open: once }],
      "2026-11",
    )
    assert.equal(plain.series.some((item) => item.label.endsWith("família")), false)
    assert.equal(plain.rows[0]?.["c6-virtual-7911"], 583.6)

    const split = projectSharedCards(
      [
        {
          name: "C6 virtual 7911",
          installments_open: [
            ...once,
            { description: "Mercado", amount: 80, category: "mercado", installment: "1/1" },
          ],
        },
        { name: "Inter", installments_open: [{ amount: 10, installment: "1/1" }] },
      ],
      "2026-11",
    )
    assert.deepEqual(
      split.series.map((item) => item.label),
      ["C6 · minha", "C6 · família", "Inter"],
    )
    assert.equal(split.rows[0]?.["c6-virtual-7911-minha"], 623.6)
    assert.equal(split.rows[0]?.["c6-virtual-7911-familia"], 40)
    assert.equal(split.rows[1]?.["c6-virtual-7911-familia"], null)
    assert.equal(split.rows[0]?.inter, 10)
  })
})
