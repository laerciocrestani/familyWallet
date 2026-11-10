export type SpendItem = {
  date: string
  box: string
  category: string
  amount: number
  note?: string
  subbox?: string
}

export type CommitItem = {
  date: string
  name: string
  amount: number
  box: string
  paid: boolean
  subbox?: string
  date_approx?: boolean
}

export type DetailLine = {
  date: string
  name: string
  amount: number
  subbox?: string
  detail?: string
  paid?: boolean
  dateApprox?: boolean
}

export type LineGroup = {
  key: string
  items: DetailLine[]
  total: number
}

const SUB_ORDER = [
  "moradia",
  "mercado",
  "familia_educacao",
  "dizimo",
  "transporte",
  "saude",
  "contas_consumo",
  "pessoais",
]

function cents(value: number) {
  return Math.round(value * 100) / 100
}

function inScope(item: { box: string; subbox?: string }, boxId: string, subbox?: string) {
  if (item.box !== boxId) return false
  if (subbox != null) return item.subbox === subbox
  return true
}

function byDate(left: DetailLine, right: DetailLine) {
  return left.date.localeCompare(right.date) || left.name.localeCompare(right.name)
}

export function linesTotal(lines: readonly { amount: number }[]) {
  return cents(lines.reduce((sum, line) => sum + line.amount, 0))
}

export function spendLines(
  items: readonly SpendItem[],
  boxId: string,
  subbox?: string,
) {
  return items
    .filter((item) => inScope(item, boxId, subbox))
    .map((item) => {
      const note = item.note?.trim()
      return {
        date: item.date,
        name: note || item.category,
        detail: note ? item.category : undefined,
        amount: item.amount,
        subbox: item.subbox,
      } satisfies DetailLine
    })
    .sort(byDate)
}

export function commitmentLines(
  items: readonly CommitItem[],
  boxId: string,
  subbox?: string,
) {
  return items
    .filter((item) => inScope(item, boxId, subbox))
    .map(
      (item) =>
        ({
          date: item.date,
          name: item.name,
          amount: item.amount,
          subbox: item.subbox,
          paid: item.paid,
          dateApprox: item.date_approx,
        }) satisfies DetailLine,
    )
    .sort(byDate)
}

export function groupLines(lines: readonly DetailLine[]) {
  if (!lines.some((line) => line.subbox)) return null
  const groups = new Map<string, DetailLine[]>()
  for (const line of lines) {
    const key = line.subbox ?? ""
    const current = groups.get(key) ?? []
    current.push(line)
    groups.set(key, current)
  }
  return [...groups.entries()]
    .sort((left, right) => rank(left[0]) - rank(right[0]))
    .map(([key, items]) => ({ key, items, total: linesTotal(items) }))
}

function rank(key: string) {
  if (!key) return SUB_ORDER.length + 1
  const index = SUB_ORDER.indexOf(key)
  return index === -1 ? SUB_ORDER.length : index
}
