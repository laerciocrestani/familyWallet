import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  commitmentLines,
  groupLines,
  linesTotal,
  spendLines,
  type DetailLine,
} from "@/lib/box-items"
import { labelOf } from "@/lib/labels"
import { formatBRL, formatDate } from "@/lib/money"
import type { Snapshot } from "@shared/snapshot"

function LineRows({ lines }: { lines: readonly DetailLine[] }) {
  return (
    <ul className="flex flex-col">
      {lines.map((line, index) => (
        <li
          key={`${line.date}-${line.name}-${index}`}
          className="flex items-start justify-between gap-3 border-b py-2 last:border-b-0"
        >
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium">
              {line.detail ? line.name : labelOf(line.name)}
            </span>
            <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{formatDate(line.date)}</span>
              {line.detail && labelOf(line.detail) !== line.name ? (
                <span>{labelOf(line.detail)}</span>
              ) : null}
              {line.dateApprox ? <span>aproximada</span> : null}
              {line.paid == null ? null : (
                <Badge variant={line.paid ? "success" : "outline"}>
                  {line.paid ? "Pago" : "A pagar"}
                </Badge>
              )}
            </span>
          </span>
          <span className="font-medium tabular-nums">{formatBRL(line.amount)}</span>
        </li>
      ))}
    </ul>
  )
}

function LineSection({ title, lines }: { title: string; lines: readonly DetailLine[] }) {
  const groups = groupLines(lines)
  const paying = lines.filter((line) => line.paid === false)
  const paid = lines.filter((line) => line.paid === true)
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium">{title}</h3>
        <span className="text-base font-medium tabular-nums">{formatBRL(linesTotal(lines))}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {lines.length === 1 ? "1 item" : `${lines.length} itens`}
        {paying.length > 0 && paid.length > 0
          ? ` · a pagar ${formatBRL(linesTotal(paying))} · pagos ${formatBRL(linesTotal(paid))}`
          : ""}
      </p>
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum item neste retrato.</p>
      ) : groups ? (
        groups.map((group) => (
          <div key={group.key || "sem"} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 pt-2">
              <h4 className="text-sm font-medium">
                {group.key ? labelOf(group.key) : "Sem subcaixinha"}
              </h4>
              <span className="text-sm tabular-nums">{formatBRL(group.total)}</span>
            </div>
            <LineRows lines={group.items} />
          </div>
        ))
      ) : (
        <LineRows lines={lines} />
      )}
    </section>
  )
}

export function BoxDialog({
  title,
  description,
  snapshot,
  boxId,
  subbox,
  childrenItems,
  children,
}: {
  title: string
  description: string
  snapshot: Snapshot
  boxId: string
  subbox?: string
  childrenItems?: { id: string; planned: number; done: number }[]
  children: ReactNode
}) {
  const spent = spendLines(snapshot.transactions, boxId, subbox)
  const committed = commitmentLines(snapshot.commitments, boxId, subbox)
  const planned = linesTotal((childrenItems ?? []).map((item) => ({ amount: item.planned })))
  const done = linesTotal((childrenItems ?? []).map((item) => ({ amount: item.done })))

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="h-full w-full cursor-pointer text-left font-[inherit]"
          aria-label={`Ver itens de ${title}`}
        >
          {children}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/60 px-3 py-2">
            <p className="text-xs text-muted-foreground">Gasto</p>
            <p className="text-lg font-medium tabular-nums">{formatBRL(linesTotal(spent))}</p>
          </div>
          <div className="rounded-lg bg-muted/60 px-3 py-2">
            <p className="text-xs text-muted-foreground">Comprometido</p>
            <p className="text-lg font-medium tabular-nums">
              {formatBRL(linesTotal(committed))}
            </p>
          </div>
        </div>
        <LineSection title="Gasto" lines={spent} />
        <LineSection title="Comprometido" lines={committed} />
        {childrenItems?.length ? (
          <section className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-medium">Filhos</h3>
              <span className="text-sm text-muted-foreground tabular-nums">
                feito {formatBRL(done)} · previsto {formatBRL(planned)}
              </span>
            </div>
            <ul className="flex flex-col">
              {childrenItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 border-b py-2 last:border-b-0"
                >
                  <span>{labelOf(item.id)}</span>
                  <span className="text-right text-muted-foreground tabular-nums">
                    {formatBRL(item.done)} / {formatBRL(item.planned)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
