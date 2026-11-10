const BOX_ORDER = ["necessidades", "desejos", "seguranca", "futuro"]

export type BoxFigures = {
  id: string
  ceiling?: number
  spent?: number
  committed?: number
  free?: number
  allocated?: number
  projected_over?: number
}

function cents(value: number) {
  return Math.round(value * 100) / 100
}

export function isFourBoxModel(input: {
  model?: { name?: string } | null
  boxes: readonly { id: string }[]
}) {
  return (
    input.boxes.some((box) => box.id === "seguranca") ||
    input.model?.name === "modelo 4 caixinhas"
  )
}

export function orderedBoxes<T extends { id: string }>(boxes: readonly T[]) {
  return [...boxes].sort((a, b) => {
    const left = BOX_ORDER.indexOf(a.id)
    const right = BOX_ORDER.indexOf(b.id)
    return (left === -1 ? BOX_ORDER.length : left) - (right === -1 ? BOX_ORDER.length : right)
  })
}

export function isExpenseBox(id: string) {
  return id === "necessidades" || id === "desejos"
}

export function expenseUsed(box: { spent?: number; committed?: number }) {
  return cents((box.spent ?? 0) + (box.committed ?? 0))
}

export function boxUsed(box: BoxFigures, four: boolean) {
  if (four && isExpenseBox(box.id)) return expenseUsed(box)
  return box.spent ?? box.allocated ?? 0
}

export function isOver(used: number, ceiling: number, projectedOver?: number) {
  return (projectedOver ?? 0) > 0 || (ceiling > 0 && used > ceiling)
}

export function freeIsTight(free: number | undefined, ceiling: number) {
  if (free == null) return false
  if (free < 0) return true
  return ceiling > 0 && free < ceiling * 0.1
}

export function barPercent(used: number, ceiling: number) {
  if (ceiling <= 0) return 0
  return Math.min(100, Math.round((used / ceiling) * 100))
}

export function weekOnPace(spent: number, budget: number) {
  return budget > 0 && spent < budget
}

export function sharePercent(value: number) {
  return `${Math.round(value * 100)}%`
}

const MODEL_BOXES = ["necessidades", "desejos", "seguranca", "futuro"] as const

type ModelBoxId = (typeof MODEL_BOXES)[number]

function isModelBoxId(id: string): id is ModelBoxId {
  return (MODEL_BOXES as readonly string[]).includes(id)
}

export function displayCeiling(
  box: { id: string; ceiling?: number },
  ceilings?: Partial<Record<ModelBoxId, number>> | null,
) {
  if (typeof box.ceiling === "number") return box.ceiling
  if (!ceilings || !isModelBoxId(box.id)) return 0
  const fallback = ceilings[box.id]
  return typeof fallback === "number" ? fallback : 0
}
