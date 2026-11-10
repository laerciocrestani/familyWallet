import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { categoryRadarSet, categoryTotals } from "./categories.ts"

describe("categorias do mês", () => {
  it("soma a mesma categoria e ordena pelo nome", () => {
    assert.deepEqual(
      categoryTotals([
        { category: "mercado", amount: 10.1 },
        { category: "saude", amount: 5 },
        { category: "mercado", amount: 0.2 },
        { category: "carro", amount: 7 },
      ]),
      [
        { category: "carro", amount: 7 },
        { category: "mercado", amount: 10.3 },
        { category: "saude", amount: 5 },
      ],
    )
  })

  it("omite categoria que fecha em zero", () => {
    assert.deepEqual(
      categoryTotals([
        { category: "mercado", amount: 10 },
        { category: "mercado", amount: -10 },
        { category: "casa", amount: 4 },
      ]),
      [{ category: "casa", amount: 4 }],
    )
  })

  it("período sem lançamento não tem eixo", () => {
    assert.deepEqual(categoryTotals([]), [])
  })

  it("separa necessidades e desejos e soma as duas no geral", () => {
    const set = categoryRadarSet([
      { box: "necessidades", category: "carro", amount: 1000 },
      { box: "desejos", category: "carro", amount: 70 },
      { box: "desejos", category: "restaurante", amount: 10 },
      { box: "futuro", category: "reserva", amount: 500 },
    ])
    assert.deepEqual(set.necessidades, [{ category: "carro", amount: 1000 }])
    assert.deepEqual(set.desejos, [
      { category: "carro", amount: 70 },
      { category: "restaurante", amount: 10 },
    ])
    assert.deepEqual(set.geral, [
      { category: "carro", amount: 1070 },
      { category: "restaurante", amount: 10 },
    ])
  })
})
