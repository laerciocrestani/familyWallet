import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { formatIsoDate, isFullMonth, monthBounds, parseIsoDate, shiftMonth } from "./period.ts"

describe("período", () => {
  it("conhece o último dia do mês", () => {
    assert.deepEqual(monthBounds("2026-11"), {
      from: "2026-11-01",
      to: "2026-11-30",
    })
    assert.deepEqual(monthBounds("2024-02"), {
      from: "2024-02-01",
      to: "2024-02-29",
    })
  })

  it("avança e volta o mês", () => {
    assert.equal(shiftMonth("2026-01", -1), "2025-12")
    assert.equal(shiftMonth("2026-12", 1), "2027-01")
  })

  it("converte data local sem mudar o dia", () => {
    const date = parseIsoDate("2026-11-04")
    assert.equal(date.getFullYear(), 2026)
    assert.equal(date.getMonth(), 10)
    assert.equal(date.getDate(), 4)
    assert.equal(formatIsoDate(date), "2026-11-04")
  })

  it("reconhece o mês cheio", () => {
    assert.equal(isFullMonth("2026-11-01", "2026-11-30"), true)
    assert.equal(isFullMonth("2026-11-02", "2026-11-30"), false)
    assert.equal(isFullMonth("2026-11-01", "2026-12-01"), false)
  })
})
