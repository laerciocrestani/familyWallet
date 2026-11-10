import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  barPercent,
  boxUsed,
  displayCeiling,
  expenseUsed,
  freeIsTight,
  isFourBoxModel,
  isOver,
  orderedBoxes,
  sharePercent,
  weekOnPace,
} from "./boxes.ts"

const october = {
  boxes: [
    { id: "necessidades" },
    { id: "desejos" },
    { id: "futuro" },
  ],
}

const november = {
  model: { name: "modelo 4 caixinhas" },
  boxes: [
    { id: "necessidades" },
    { id: "desejos" },
    { id: "seguranca" },
    { id: "futuro" },
  ],
}

describe("modelo das caixinhas", () => {
  it("deixa outubro nas três caixinhas", () => {
    assert.equal(isFourBoxModel(october), false)
  })

  it("reconhece novembro pelo id seguranca ou pelo nome do modelo", () => {
    assert.equal(isFourBoxModel(november), true)
    assert.equal(
      isFourBoxModel({
        boxes: [{ id: "necessidades" }, { id: "seguranca" }],
      }),
      true,
    )
    assert.equal(
      isFourBoxModel({
        model: { name: "modelo 4 caixinhas" },
        boxes: [{ id: "necessidades" }],
      }),
      true,
    )
  })

  it("ordena as quatro caixinhas", () => {
    assert.deepEqual(
      orderedBoxes([
        { id: "futuro" },
        { id: "seguranca" },
        { id: "desejos" },
        { id: "necessidades" },
      ]).map((box) => box.id),
      ["necessidades", "desejos", "seguranca", "futuro"],
    )
  })
})

describe("números de novembro/2026 na tela", () => {
  const necessidades = {
    id: "necessidades",
    ceiling: 11900,
    spent: 146.86,
    committed: 8397.57,
    free: 3355.57,
    projected_over: 0,
  }
  const desejos = {
    id: "desejos",
    ceiling: 2550,
    spent: 0,
    committed: 2533.89,
    free: 16.11,
    projected_over: 0,
  }

  it("soma gasto e comprometido sem refazer o teto", () => {
    assert.equal(expenseUsed(necessidades), 8544.43)
    assert.equal(boxUsed(necessidades, true), 8544.43)
    assert.equal(barPercent(8544.43, 11900), 72)
    assert.equal(isOver(8544.43, 11900, 0), false)
    assert.equal(freeIsTight(3355.57, 11900), false)
    assert.equal(expenseUsed(desejos), 2533.89)
    assert.equal(freeIsTight(16.11, 2550), true)
  })

  it("no modelo antigo a barra de necessidades continua só com o gasto", () => {
    assert.equal(boxUsed(necessidades, false), 146.86)
  })

  it("segurança e futuro usam o que já foi guardado", () => {
    assert.equal(
      boxUsed({ id: "seguranca", ceiling: 1020, allocated: 0, free: 1020 }, true),
      0,
    )
    assert.equal(
      boxUsed({ id: "futuro", ceiling: 1530, allocated: 0, free: 1530 }, true),
      0,
    )
  })

  it("marca a semana verde só quando o gasto está abaixo do orçamento", () => {
    assert.equal(weekOnPace(0, 2767.44), true)
    assert.equal(weekOnPace(2767.44, 2767.44), false)
    assert.equal(weekOnPace(2800, 2767.44), false)
  })

  it("mostra os percentuais do modelo como vieram", () => {
    assert.equal(sharePercent(0.7), "70%")
    assert.equal(sharePercent(0.15), "15%")
    assert.equal(sharePercent(0.06), "6%")
    assert.equal(sharePercent(0.09), "9%")
  })

  it("usa o teto da caixinha e só cai para model.ceilings se ele faltar", () => {
    assert.equal(
      displayCeiling(
        { id: "necessidades", ceiling: 11900 },
        { necessidades: 1 },
      ),
      11900,
    )
    assert.equal(
      displayCeiling({ id: "seguranca" }, { seguranca: 1020 }),
      1020,
    )
    assert.equal(displayCeiling({ id: "futuro" }, null), 0)
  })
})
