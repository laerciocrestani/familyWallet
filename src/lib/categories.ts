type Spend = {
  category: string
  amount: number
}

type BoxedSpend = Spend & {
  box: string
  subbox?: string
}

type BoxedCommitment = {
  box: string
  name: string
  amount: number
  subbox?: string
}

type SubboxBudget = {
  key: string
  name?: string
  ceiling?: number
}

export type CategoryTotal = {
  category: string
  amount: number
}

export type RadarPoint = {
  label: string
  projected: number
  actual: number
}

function cents(value: number) {
  return Math.round(value * 100) / 100
}

export function categoryTotals(transactions: readonly Spend[]): CategoryTotal[] {
  const totals = new Map<string, number>()
  for (const item of transactions) {
    totals.set(item.category, cents((totals.get(item.category) ?? 0) + item.amount))
  }
  return [...totals.entries()]
    .filter(([, amount]) => amount !== 0)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => a.category.localeCompare(b.category, "pt-BR"))
}

type RadarBucket = {
  label: string
  projected: number
  actual: number
}

export function boxSpendRadar(
  boxId: string,
  transactions: readonly BoxedSpend[],
  commitments: readonly BoxedCommitment[],
  subboxes: readonly SubboxBudget[] = [],
): RadarPoint[] {
  const commits = commitments.filter((item) => item.box === boxId)
  const spends = transactions.filter((item) => item.box === boxId)
  const buckets = new Map<string, RadarBucket>()

  if (subboxes.length > 0) {
    for (const subbox of subboxes) {
      const committed = sumAmount(commits.filter((item) => item.subbox === subbox.key))
      const spent = sumAmount(spends.filter((item) => inSubbox(item, subbox.key)))
      const actual = cents(spent + committed)
      const variable = committed === 0
      const projected = variable ? (subbox.ceiling ?? actual) : actual
      addBucket(
        buckets,
        `sub:${subbox.key}`,
        subbox.name?.trim() || subbox.key,
        projected,
        actual,
      )
    }
    for (const item of commits) {
      if (item.subbox && subboxes.some((subbox) => subbox.key === item.subbox)) continue
      addBucket(buckets, `commit:${item.name}`, item.name, item.amount, item.amount)
    }
    for (const item of spends) {
      if (item.subbox && subboxes.some((subbox) => subbox.key === item.subbox)) continue
      if (!item.subbox && subboxes.some((subbox) => subbox.key === item.category)) continue
      addBucket(buckets, `spend:${item.category}`, item.category, item.amount, item.amount)
    }
  } else {
    for (const item of commits) {
      addBucket(buckets, `commit:${item.name}`, item.name, item.amount, item.amount)
    }
    for (const item of spends) {
      addBucket(buckets, `spend:${item.category}`, item.category, item.amount, item.amount)
    }
  }

  return [...buckets.values()]
    .filter((point) => point.projected !== 0 || point.actual !== 0)
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"))
}

function sumAmount(items: readonly { amount: number }[]) {
  return cents(items.reduce((sum, item) => sum + item.amount, 0))
}

function inSubbox(item: BoxedSpend, key: string) {
  if (item.subbox) return item.subbox === key
  return item.category === key
}

function addBucket(
  buckets: Map<string, RadarBucket>,
  key: string,
  label: string,
  projected: number,
  actual: number,
) {
  const current = buckets.get(key) ?? { label, projected: 0, actual: 0 }
  current.projected = cents(current.projected + projected)
  current.actual = cents(current.actual + actual)
  buckets.set(key, current)
}
