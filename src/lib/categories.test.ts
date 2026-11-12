import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { boxSpendRadar, categoryTotals } from "./categories.ts"

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

  it("deixa mercado crescente e pensão no mesmo nível", () => {
    const points = boxSpendRadar(
      "necessidades",
      [
        { box: "necessidades", category: "mercado", amount: 40, subbox: "mercado" },
        { box: "necessidades", category: "mercado", amount: 17, subbox: "mercado" },
        { box: "necessidades", category: "consulta", amount: 34, subbox: "saude" },
        { box: "desejos", category: "lazer", amount: 80 },
      ],
      [
        { box: "necessidades", name: "Pensão", amount: 1000, subbox: "familia_educacao" },
        { box: "necessidades", name: "Cartão de Todos", amount: 33.4, subbox: "saude" },
        { box: "desejos", name: "Bento Vôlei", amount: 150 },
        { box: "futuro", name: "Reserva", amount: 200 },
      ],
      [
        { key: "mercado", name: "Mercado", ceiling: 2300 },
        { key: "saude", name: "Saúde", ceiling: 350 },
        { key: "familia_educacao", name: "Família e educação", ceiling: 2810 },
        { key: "pessoais", name: "Pessoais", ceiling: 120 },
      ],
    )
    assert.deepEqual(points, [
      { label: "Família e educação", projected: 1000, actual: 1000 },
      { label: "Mercado", projected: 2300, actual: 57 },
      { label: "Pessoais", projected: 120, actual: 0 },
      { label: "Saúde", projected: 67.4, actual: 67.4 },
    ])
  })

  it("trata desejos fixos com projeção igual ao atual", () => {
    assert.deepEqual(
      boxSpendRadar(
        "desejos",
        [],
        [
          { box: "desejos", name: "Bento Vôlei", amount: 150 },
          { box: "desejos", name: "Fatura Inter", amount: 922.11 },
        ],
      ),
      [
        { label: "Bento Vôlei", projected: 150, actual: 150 },
        { label: "Fatura Inter", projected: 922.11, actual: 922.11 },
      ],
    )
  })

  it("não desenha eixo quando projeção e atual fecham em zero", () => {
    assert.deepEqual(
      boxSpendRadar(
        "necessidades",
        [],
        [],
        [{ key: "pessoais", name: "Pessoais", ceiling: 0 }],
      ),
      [],
    )
  })
})
