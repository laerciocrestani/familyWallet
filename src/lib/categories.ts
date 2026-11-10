type Spend = {
  category: string
  amount: number
}

type BoxedSpend = Spend & {
  box: string
}

export type CategoryTotal = {
  category: string
  amount: number
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

export type CategoryRadarSet = {
  geral: CategoryTotal[]
  necessidades: CategoryTotal[]
  desejos: CategoryTotal[]
}

export function categoryRadarSet(
  transactions: readonly BoxedSpend[],
): CategoryRadarSet {
  const included = transactions.filter(
    (item) => item.box === "necessidades" || item.box === "desejos",
  )
  return {
    geral: categoryTotals(included),
    necessidades: categoryTotals(
      included.filter((item) => item.box === "necessidades"),
    ),
    desejos: categoryTotals(included.filter((item) => item.box === "desejos")),
  }
}
