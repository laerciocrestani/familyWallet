export type ShareLine = {
  amount: number
  description?: string
  box?: string
  category?: string
  subbox?: string
}

export type StatementShare = {
  bank: number
  grocery: number
  family: number
  mine: number
  mineNecessidades: number
  mineOther: number
}

const GROCERY = /mercado|supermercado/i

export function isFamilyCard(name: string) {
  return /c6/i.test(name)
}

export function isGrocery(line: ShareLine) {
  return [line.category, line.subbox, line.description].some(
    (value) => typeof value === "string" && GROCERY.test(value),
  )
}

function toCents(value: number) {
  return Math.round(value * 100)
}

function fromCents(value: number) {
  return value / 100
}

export function statementShare(
  lines: readonly ShareLine[],
  bank?: number,
): StatementShare {
  let grocery = 0
  let mineGrocery = 0
  let mineNecessidades = 0
  let mineOther = 0

  for (const line of lines) {
    const amount = toCents(line.amount)
    if (amount === 0) continue
    if (isGrocery(line)) {
      const familyPart = Math.floor(amount / 2)
      grocery += amount
      mineGrocery += amount - familyPart
      continue
    }
    if (line.box === "necessidades") mineNecessidades += amount
    else mineOther += amount
  }

  const family = grocery - mineGrocery
  mineNecessidades += mineGrocery
  const detailed = mineNecessidades + mineOther + family
  const stated = typeof bank === "number" ? toCents(bank) : detailed
  const bankCents = stated >= detailed ? stated : detailed
  const gap = bankCents - detailed
  if (gap > 0) mineOther += gap

  return {
    bank: fromCents(bankCents),
    grocery: fromCents(grocery),
    family: fromCents(family),
    mine: fromCents(bankCents - family),
    mineNecessidades: fromCents(mineNecessidades),
    mineOther: fromCents(mineOther),
  }
}
