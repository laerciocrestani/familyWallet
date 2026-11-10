import { isFamilyCard, statementShare, type ShareLine } from "./card-share.ts"
import { shiftMonth } from "./period.ts"

export const CARD_HORIZON = 6

type Tagged = {
  description?: unknown
  box?: unknown
  category?: unknown
  subbox?: unknown
}

type ParcelItem = Tagged & {
  amount: number
  index?: number
  count?: number
  installment?: unknown
  last_month_in_projection?: unknown
}

type RecurringItem = Tagged & {
  amount?: unknown
}

export type MonthCharge = {
  amount: number
  description?: string
  box?: string
  category?: string
  subbox?: string
}

export type ForecastCard = {
  name: string
  installments_open?: readonly ParcelItem[]
  recurring?: readonly RecurringItem[]
  charges?: readonly RecurringItem[]
  purchases?: readonly RecurringItem[]
}

export type ForecastSeries = {
  key: string
  label: string
}

export type ForecastRow = {
  month: string
  label: string
  [cardKey: string]: string | number | null
}

export function parcelParts(item: {
  index?: number
  count?: number
  installment?: unknown
}) {
  if (item.index != null && item.count != null) {
    return { index: item.index, count: item.count }
  }
  if (typeof item.installment !== "string") return null
  const match = /^(\d+)\/(\d+)$/.exec(item.installment)
  if (!match) return null
  return { index: Number(match[1]), count: Number(match[2]) }
}

export function projectionLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number)
  const name = new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(new Date(year, monthNumber - 1, 1))
    .replace(".", "")
  const short = name.charAt(0).toUpperCase() + name.slice(1)
  return `${short}/${String(year).slice(2)}`
}

export function projectionMonths(anchor: string, ahead = CARD_HORIZON) {
  return Array.from({ length: ahead + 1 }, (_, index) => shiftMonth(anchor, index))
}

function monthsAfter(anchor: string, target: string) {
  const [anchorYear, anchorMonth] = anchor.split("-").map(Number)
  const [targetYear, targetMonth] = target.split("-").map(Number)
  return (targetYear - anchorYear) * 12 + (targetMonth - anchorMonth)
}

function cents(value: number) {
  return Math.round(value * 100) / 100
}

function cardKey(name: string, index: number) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return slug || `card-${index}`
}

function lastMonth(item: ParcelItem) {
  const last = item.last_month_in_projection
  return typeof last === "string" && /^\d{4}-\d{2}$/.test(last) ? last : null
}

function installmentAmount(item: ParcelItem, anchor: string, target: string) {
  const parts = parcelParts(item)
  if (!parts || parts.count < 1) return 0
  const offset = monthsAfter(anchor, target)
  if (offset < 0 || parts.index + offset > parts.count) return 0
  const last = lastMonth(item)
  if (last && (last < anchor || (last === anchor && offset > 0))) return 0
  return item.amount
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined
}

function asCharge(item: Tagged, amount: number): MonthCharge {
  return {
    amount,
    description: text(item.description),
    box: text(item.box),
    category: text(item.category),
    subbox: text(item.subbox),
  }
}

export function chargesInMonth(
  card: ForecastCard,
  anchor: string,
  target: string,
) {
  if (monthsAfter(anchor, target) < 0) return []
  const charges: MonthCharge[] = []
  for (const item of card.installments_open ?? []) {
    const amount = installmentAmount(item, anchor, target)
    if (amount > 0) charges.push(asCharge(item, amount))
  }
  for (const item of card.recurring ?? []) {
    if (typeof item.amount === "number" && item.amount > 0) {
      charges.push(asCharge(item, item.amount))
    }
  }
  if (target === anchor) {
    for (const item of [...(card.charges ?? []), ...(card.purchases ?? [])]) {
      if (typeof item.amount === "number" && item.amount > 0) {
        charges.push(asCharge(item, item.amount))
      }
    }
  }
  return charges
}

function shareLines(charges: readonly MonthCharge[]): ShareLine[] {
  return charges.map((item) => ({
    amount: item.amount,
    description: item.description,
    box: item.box,
    category: item.category,
    subbox: item.subbox,
  }))
}

export function projectCards(cards: readonly ForecastCard[], anchor: string) {
  const months = projectionMonths(anchor)
  const series: ForecastSeries[] = cards.map((card, index) => ({
    key: cardKey(card.name, index),
    label: card.name,
  }))
  const rows: ForecastRow[] = months.map((month) => {
    const row: ForecastRow = { month, label: projectionLabel(month) }
    cards.forEach((card, index) => {
      const key = series[index].key
      const total = chargesInMonth(card, anchor, month).reduce(
        (sum, item) => cents(sum + item.amount),
        0,
      )
      row[key] = total > 0 ? total : null
    })
    return row
  })
  const active = series.filter((item) =>
    rows.some((row) => typeof row[item.key] === "number"),
  )
  return { rows, series: active }
}

export function projectSharedCards(
  cards: readonly ForecastCard[],
  anchor: string,
) {
  const months = projectionMonths(anchor)
  const plans = cards.map((card, index) => {
    const base = cardKey(card.name, index)
    const shares = months.map((month) =>
      statementShare(shareLines(chargesInMonth(card, anchor, month))),
    )
    const split =
      isFamilyCard(card.name) && shares.some((item) => item.family > 0)
    const short = isFamilyCard(card.name) ? "C6" : card.name
    return split
      ? {
          series: [
            { key: `${base}-minha`, label: `${short} · minha` },
            { key: `${base}-familia`, label: `${short} · família` },
          ],
          shares,
          split: true,
        }
      : {
          series: [{ key: base, label: card.name }],
          shares,
          split: false,
        }
  })
  const series = plans.flatMap((plan) => plan.series)
  const rows: ForecastRow[] = months.map((month, monthIndex) => {
    const row: ForecastRow = { month, label: projectionLabel(month) }
    for (const plan of plans) {
      const share = plan.shares[monthIndex]
      if (plan.split) {
        row[plan.series[0].key] = share.mine > 0 ? share.mine : null
        row[plan.series[1].key] = share.family > 0 ? share.family : null
      } else {
        row[plan.series[0].key] = share.bank > 0 ? share.bank : null
      }
    }
    return row
  })
  const active = series.filter((item) =>
    rows.some((row) => typeof row[item.key] === "number"),
  )
  return { rows, series: active }
}

export function cardMonthTotals(
  rows: readonly ForecastRow[],
  series: readonly ForecastSeries[],
) {
  return rows.map((row) => {
    const total = series.reduce((sum, item) => {
      const value = row[item.key]
      return typeof value === "number" ? cents(sum + value) : sum
    }, 0)
    return { month: row.month, label: row.label, total }
  })
}
