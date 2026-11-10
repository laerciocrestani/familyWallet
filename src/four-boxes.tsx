import { cn } from "cn"
import { BoxDialog } from "@/box-detail"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  barPercent,
  displayCeiling,
  expenseUsed,
  freeIsTight,
  isExpenseBox,
  isOver,
  orderedBoxes,
  sharePercent,
  weekOnPace,
} from "@/lib/boxes"
import { labelOf } from "@/lib/labels"
import { formatBRL, formatDate } from "@/lib/money"
import type { Snapshot } from "@shared/snapshot"

const SHARE_ORDER = ["necessidades", "desejos", "seguranca", "futuro"] as const

function weekRange(weekly: { week_start?: string; week_end?: string }) {
  if (weekly.week_start && weekly.week_end) {
    return `${formatDate(weekly.week_start)} – ${formatDate(weekly.week_end)}`
  }
  return "Orçamento desta semana"
}

function MoneyLine({
  label,
  value,
  tight = false,
}: {
  label: string
  value: string
  tight?: boolean
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          tight
            ? "text-right font-medium text-destructive tabular-nums"
            : "text-right font-medium tabular-nums"
        }
      >
        {value}
      </dd>
    </>
  )
}

function ExpenseCard({
  box,
  ceiling,
  snapshot,
}: {
  box: Snapshot["boxes"][number]
  ceiling: number
  snapshot: Snapshot
}) {
  const used = expenseUsed(box)
  const tight = freeIsTight(box.free, ceiling)
  const over = isOver(used, ceiling, box.projected_over)
  return (
    <BoxDialog
      title={labelOf(box.id)}
      description={`Teto ${formatBRL(ceiling)}`}
      snapshot={snapshot}
      boxId={box.id}
    >
    <Card data-box={box.id} className="h-full transition-shadow hover:ring-foreground/25">
      <CardHeader>
        <CardTitle>{labelOf(box.id)}</CardTitle>
        <CardDescription>{barPercent(used, ceiling)}% do teto</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-2xl font-medium">{formatBRL(used)}</p>
            <p className="text-sm text-muted-foreground">usados</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {over ? <Badge variant="destructive">acima</Badge> : null}
            {tight ? <Badge variant="destructive">livre baixo</Badge> : null}
          </div>
        </div>
        <Progress value={barPercent(used, ceiling)} />
        <p className="text-sm text-muted-foreground">teto {formatBRL(ceiling)}</p>
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
          <MoneyLine label="Gasto" value={formatBRL(box.spent ?? 0)} />
          <MoneyLine label="Comprometido" value={formatBRL(box.committed ?? 0)} />
          <MoneyLine
            label="Livre"
            value={box.free == null ? "—" : formatBRL(box.free)}
            tight={tight}
          />
        </dl>
        <p className="text-xs text-muted-foreground">Ver gasto e comprometido</p>
      </CardContent>
    </Card>
    </BoxDialog>
  )
}

function SavingsCard({
  box,
  ceiling,
  snapshot,
}: {
  box: Snapshot["boxes"][number]
  ceiling: number
  snapshot: Snapshot
}) {
  const saved = box.allocated ?? 0
  return (
    <BoxDialog
      title={labelOf(box.id)}
      description={`Meta ${formatBRL(ceiling)}`}
      snapshot={snapshot}
      boxId={box.id}
      childrenItems={box.children}
    >
    <Card data-box={box.id} className="h-full transition-shadow hover:ring-foreground/25">
      <CardHeader>
        <CardTitle>{labelOf(box.id)}</CardTitle>
        <CardDescription>Já separado neste mês</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div>
          <p className="text-2xl font-medium">{formatBRL(saved)}</p>
          <p className="text-sm text-muted-foreground">guardado</p>
        </div>
        <Progress value={barPercent(saved, ceiling)} />
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
          <MoneyLine label="Meta" value={formatBRL(ceiling)} />
          <MoneyLine
            label="Falta guardar"
            value={box.free == null ? "—" : formatBRL(box.free)}
          />
        </dl>
        {box.children?.length ? (
          <ul className="flex flex-col gap-2 border-t pt-3 text-sm">
            {box.children.map((child) => (
              <li key={child.id} className="flex flex-col">
                <span>{labelOf(child.id)}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatBRL(child.done)} / {formatBRL(child.planned)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-xs text-muted-foreground">Ver gasto e comprometido</p>
      </CardContent>
    </Card>
    </BoxDialog>
  )
}

function ModelHeader({ snapshot }: { snapshot: Snapshot }) {
  const model = snapshot.model
  const monthIncome = model?.income ?? snapshot.income.expected
  const shares = SHARE_ORDER.flatMap((id) => {
    const value = model?.percentages?.[id]
    return typeof value === "number" ? [`${labelOf(id)} ${sharePercent(value)}`] : []
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Renda do mês</CardTitle>
        <CardDescription>
          {model?.income_reference == null
            ? "Prevista neste retrato"
            : `Referência ${formatBRL(model.income_reference)}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-2xl font-medium">{formatBRL(monthIncome)}</p>
        {shares.length > 0 ? (
          <p className="text-sm text-muted-foreground">{shares.join(" · ")}</p>
        ) : null}
        {model?.rule ? (
          <p className="text-sm text-muted-foreground">{model.rule}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Subboxes({
  box,
  snapshot,
}: {
  box: Snapshot["boxes"][number]
  snapshot: Snapshot
}) {
  const subboxes = box.subboxes ?? []
  if (subboxes.length === 0) return null
  return (
    <section className="flex flex-col gap-3" data-subboxes={box.id}>
      <div>
        <h2 className="text-base font-medium">Subcaixinhas de {labelOf(box.id)}</h2>
        <p className="text-sm text-muted-foreground">
          Teto, comprometido, gasto e livre como vieram no retrato.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {subboxes.map((subbox) => {
          const ceiling = subbox.ceiling ?? 0
          const used = expenseUsed(subbox)
          const tight = freeIsTight(subbox.free, ceiling)
          const over = isOver(used, ceiling)
          const name = subbox.name?.trim() || labelOf(subbox.key)
          return (
            <BoxDialog
              key={subbox.key}
              title={name}
              description={`Teto ${formatBRL(ceiling)}`}
              snapshot={snapshot}
              boxId={box.id}
              subbox={subbox.key}
            >
            <Card data-subbox={subbox.key} className="h-full transition-shadow hover:ring-foreground/25">
              <CardHeader>
                <CardTitle>{name}</CardTitle>
                <CardDescription>teto {formatBRL(ceiling)}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-lg font-medium">{formatBRL(used)}</p>
                  <div className="flex flex-col items-end gap-1">
                    {over ? <Badge variant="destructive">acima</Badge> : null}
                    {tight ? <Badge variant="destructive">livre baixo</Badge> : null}
                  </div>
                </div>
                <Progress value={barPercent(used, ceiling)} />
                <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-sm">
                  <MoneyLine label="Gasto" value={formatBRL(subbox.spent ?? 0)} />
                  <MoneyLine
                    label="Comprometido"
                    value={formatBRL(subbox.committed ?? 0)}
                  />
                  <MoneyLine
                    label="Livre"
                    value={subbox.free == null ? "—" : formatBRL(subbox.free)}
                    tight={tight}
                  />
                </dl>
                <p className="text-xs text-muted-foreground">Ver gasto e comprometido</p>
              </CardContent>
            </Card>
            </BoxDialog>
          )
        })}
      </div>
    </section>
  )
}

function WeekCard({
  weekly,
}: {
  weekly: NonNullable<Snapshot["boxes"][number]["weekly"]>
}) {
  const onPace = weekOnPace(weekly.spent, weekly.budget)
  const over = weekly.budget > 0 && weekly.spent > weekly.budget
  return (
    <Card data-week="necessidades">
      <CardHeader>
        <CardTitle>Semana de Necessidades</CardTitle>
        <CardDescription>{weekRange(weekly)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-2xl font-medium">{formatBRL(weekly.spent)}</p>
          {onPace ? <Badge variant="success">no ritmo</Badge> : null}
          {over ? <Badge variant="destructive">acima</Badge> : null}
        </div>
        <Progress value={barPercent(weekly.spent, weekly.budget)} />
        <p className="text-sm text-muted-foreground">
          de {formatBRL(weekly.budget)} nesta semana
        </p>
      </CardContent>
    </Card>
  )
}

export function FourBoxes({ snapshot }: { snapshot: Snapshot }) {
  const boxes = orderedBoxes(snapshot.boxes)
  const necessidades = boxes.find((box) => box.id === "necessidades")
  const weekly = necessidades?.weekly

  return (
    <div className="flex flex-col gap-6" data-layout="four">
      <ModelHeader snapshot={snapshot} />
      <section
        className={cn(
          "grid gap-4 md:grid-cols-2",
          boxes.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
        )}
      >
        {boxes.map((box) => {
          const ceiling = displayCeiling(box, snapshot.model?.ceilings)
          return isExpenseBox(box.id) ? (
            <ExpenseCard key={box.id} box={box} ceiling={ceiling} snapshot={snapshot} />
          ) : (
            <SavingsCard key={box.id} box={box} ceiling={ceiling} snapshot={snapshot} />
          )
        })}
      </section>
      {necessidades ? <Subboxes box={necessidades} snapshot={snapshot} /> : null}
      {weekly ? <WeekCard weekly={weekly} /> : null}
    </div>
  )
}
