import { useCallback, useEffect, useRef, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  XAxis,
} from "recharts"
import { CalendarIcon, ChevronLeft, ChevronRight, LogOut, RefreshCw, Wallet } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { ptBR } from "react-day-picker/locale"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldLabel } from "@/components/ui/field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "cn"
import { FourBoxes } from "@/four-boxes"
import { fetchRange, type SnapshotResponse } from "@/lib/api"
import { boxUsed, displayCeiling, orderedBoxes } from "@/lib/boxes"
import { isFamilyCard, statementShare } from "@/lib/card-share"
import {
  cardMonthTotals,
  chargesInMonth,
  parcelParts,
  projectSharedCards,
} from "@/lib/cards"
import { categoryRadarSet, type CategoryTotal } from "@/lib/categories"
import { labelOf } from "@/lib/labels"
import { formatBRL, formatDate, formatDateTime } from "@/lib/money"
import {
  currentMonth,
  formatIsoDate,
  formatMonth,
  inRange,
  isFullMonth,
  monthBounds,
  monthKey,
  parseIsoDate,
  shiftMonth,
} from "@/lib/period"
import type { Snapshot } from "@shared/snapshot"

const chartConfig = {
  used: { label: "No mês", color: "var(--chart-1)" },
  ceiling: { label: "Teto", color: "var(--chart-2)" },
} satisfies ChartConfig

function parcelText(item: Installment) {
  const parts = parcelParts(item)
  if (parts) return `${parts.index}/${parts.count}`
  if (item.remaining != null) return `${item.remaining}x`
  return null
}

function isLastParcel(item: Installment) {
  const parts = parcelParts(item)
  return parts != null && parts.index === parts.count
}

function topSegmentKey(
  row: Record<string, string | number | null>,
  series: readonly { key: string }[],
) {
  for (let index = series.length - 1; index >= 0; index -= 1) {
    const value = row[series[index].key]
    if (typeof value === "number" && value > 0) return series[index].key
  }
  return null
}

function moneyLabel(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function CardForecast({
  cards,
  month,
}: {
  cards: Snapshot["cards"]
  month: string
}) {
  const projection = projectSharedCards(cards, month)
  if (projection.series.length === 0) return null
  const totals = cardMonthTotals(projection.rows, projection.series)
  const config = Object.fromEntries(
    projection.series.map((series, index) => [
      series.key,
      {
        label: series.label,
        color: `var(--chart-${(index % 5) + 1})`,
      },
    ]),
  ) satisfies ChartConfig
  const start = formatMonth(projection.rows[0].month)
  const end = formatMonth(projection.rows[projection.rows.length - 1].month)

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        {start} – {end} · soma de todos os cartões
        {projection.series.some((item) => item.label.endsWith("família"))
          ? " · no C6, a fatia da família é só a metade do mercado"
          : ""}
      </p>
      <ChartContainer
        config={config}
        aria-label={`Projeção dos cartões de ${start} a ${end}`}
        className="aspect-auto h-72 w-full"
      >
        <BarChart accessibilityLayer data={projection.rows} margin={{ top: 32 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <span className="flex w-full justify-between gap-4">
                    <span className="text-muted-foreground">{String(name)}</span>
                    <span className="font-mono font-medium tabular-nums">
                      {formatBRL(Number(value))}
                    </span>
                  </span>
                )}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent className="flex-wrap" />} />
          {projection.series.map((series, index) => (
            <Bar
              key={series.key}
              dataKey={series.key}
              name={series.label}
              stackId="cards"
              fill={`var(--color-${series.key})`}
              radius={
                index === 0
                  ? [0, 0, 4, 4]
                  : index === projection.series.length - 1
                    ? [4, 4, 0, 0]
                    : 0
              }
            >
              <LabelList
                content={({ x, y, width, index: rowIndex }) => {
                  if (
                    rowIndex == null ||
                    x == null ||
                    y == null ||
                    width == null
                  ) {
                    return null
                  }
                  const row = projection.rows[rowIndex]
                  const total = totals[rowIndex]?.total
                  if (!row || !total) return null
                  if (topSegmentKey(row, projection.series) !== series.key) {
                    return null
                  }
                  return (
                    <text
                      x={Number(x) + Number(width) / 2}
                      y={Number(y) - 8}
                      textAnchor="middle"
                      className="fill-foreground"
                      fontSize={11}
                    >
                      {moneyLabel(total)}
                    </text>
                  )
                }}
              />
            </Bar>
          ))}
        </BarChart>
      </ChartContainer>
    </div>
  )
}

function CategoryRadarCard({
  heading,
  detail,
  rows,
  period,
  color,
  swatch,
  compact = false,
}: {
  heading: string
  detail: string
  rows: CategoryTotal[]
  period: string
  color: string
  swatch: string
  compact?: boolean
}) {
  const points = rows.map((item) => ({
    category: labelOf(item.category),
    amount: item.amount,
  }))
  const ranked = [...points].sort(
    (a, b) => b.amount - a.amount || a.category.localeCompare(b.category, "pt-BR"),
  )
  const total = points.reduce((sum, row) => cents(sum + row.amount), 0)
  const config = {
    amount: { label: "Gasto", color },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle>{heading}</CardTitle>
        <CardDescription>
          {detail}
          {points.length > 0 ? ` · ${formatBRL(total)}` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum lançamento neste período.
          </p>
        ) : (
          <div className="@container w-full">
            <div
              className={cn(
                "flex w-full flex-col items-center gap-4",
                compact
                  ? "@min-[28rem]:flex-row @min-[28rem]:items-center"
                  : "@3xl:flex-row @3xl:justify-center @3xl:gap-6",
              )}
            >
              <ChartContainer
                config={config}
                aria-label={`Categorias de ${heading} em ${period}`}
                className={cn(
                  "aspect-square w-full [&_.recharts-polar-angle-axis-tick_text]:fill-muted-foreground",
                  compact ? "max-w-72" : "max-w-sm",
                )}
              >
                <RadarChart
                  data={points}
                  outerRadius="70%"
                  margin={
                    compact
                      ? { top: 20, right: 76, bottom: 20, left: 76 }
                      : { top: 28, right: 88, bottom: 28, left: 88 }
                  }
                >
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        formatter={(value) => (
                          <span className="font-mono font-medium tabular-nums">
                            {formatBRL(Number(value))}
                          </span>
                        )}
                      />
                    }
                  />
                  <PolarAngleAxis dataKey="category" />
                  <PolarGrid />
                  <Radar
                    dataKey="amount"
                    fill="var(--color-amount)"
                    fillOpacity={0.6}
                    stroke="var(--color-amount)"
                    dot={{
                      r: 4,
                      fillOpacity: 1,
                    }}
                  />
                </RadarChart>
              </ChartContainer>
              <ul
                aria-label={`Valores de ${heading} em ${period}`}
                className={cn(
                  "flex w-full flex-col gap-2",
                  compact ? "min-w-0 @min-[28rem]:flex-1" : "max-w-sm @3xl:w-64 @3xl:shrink-0",
                )}
              >
                {ranked.map((row) => (
                  <li
                    key={row.category}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className={cn("size-2 shrink-0 rounded-full", swatch)} />
                      <span className="truncate">{row.category}</span>
                    </span>
                    <span className="font-mono font-medium tabular-nums">
                      {formatBRL(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CategoryRadars({
  transactions,
  month,
}: {
  transactions: Snapshot["transactions"]
  month: string
}) {
  const groups = categoryRadarSet(transactions)
  const period = formatMonth(month)

  return (
    <>
      <CategoryRadarCard
        heading="Necessidades e desejos"
        detail="Cruzamento geral dos gastos neste mês"
        rows={groups.geral}
        period={period}
        color="var(--chart-1)"
        swatch="bg-chart-1"
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryRadarCard
          heading="Necessidades"
          detail="Gastos de necessidades neste mês"
          rows={groups.necessidades}
          period={period}
          color="var(--chart-2)"
          swatch="bg-chart-2"
          compact
        />
        <CategoryRadarCard
          heading="Desejos"
          detail="Gastos de desejos neste mês"
          rows={groups.desejos}
          period={period}
          color="var(--chart-3)"
          swatch="bg-chart-3"
          compact
        />
      </div>
    </>
  )
}

function cents(value: number) {
  return Math.round(value * 100) / 100
}

function AuthorshipShare({
  card,
  month,
}: {
  card: Snapshot["cards"][number]
  month: string
}) {
  if (!isFamilyCard(card.name)) return null
  const share = statementShare(
    chargesInMonth(card, month, month),
    card.statement,
  )
  const parts = [
    {
      key: "necessidades",
      label: "Necessidades",
      amount: share.mineNecessidades,
      swatch: "bg-chart-2",
    },
    {
      key: "demais",
      label: "Demais, seus",
      amount: share.mineOther,
      swatch: "bg-chart-4",
    },
    {
      key: "familia",
      label: "Família",
      amount: share.family,
      swatch: "bg-foreground/25",
    },
  ]
  const bar = parts.filter((part) => part.amount > 0)
  const width = share.bank > 0 ? share.bank : 1

  return (
    <div className="flex flex-col gap-2 rounded-md bg-background p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">Minha autoria</p>
        <p className="font-medium tabular-nums">{formatBRL(share.mine)}</p>
      </div>
      {bar.length > 0 ? (
        <div
          className="flex h-2 overflow-hidden rounded-full bg-muted"
          aria-hidden="true"
        >
          {bar.map((part) => (
            <div
              key={part.key}
              className={part.swatch}
              style={{ width: `${(part.amount / width) * 100}%` }}
            />
          ))}
        </div>
      ) : null}
      <ul className="flex flex-col gap-1 text-sm" aria-label="Rateio do C6">
        {parts.map((part) => (
          <li key={part.key} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className={cn("size-2 rounded-full", part.swatch)} />
              {part.label}
            </span>
            <span className="tabular-nums">{formatBRL(part.amount)}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        {share.grocery > 0
          ? "Metade do mercado desta fatura entra em necessidades. A outra metade fica só aqui, fora das caixinhas."
          : "Nenhum mercado nesta fatura. O valor inteiro é seu."}
      </p>
    </div>
  )
}

function visibleInstallments(
  card: Snapshot["cards"][number],
  from: string,
  to: string,
) {
  return (card.installments_open ?? []).filter(
    (item) => item.date == null || inRange(item.date, from, to),
  )
}

type Installment = NonNullable<
  Snapshot["cards"][number]["installments_open"]
>[number]

function percent(used: number, ceiling: number) {
  if (ceiling <= 0) return 0
  return Math.min(100, Math.round((used / ceiling) * 100))
}

export function Dashboard({
  token,
  onSignOut,
}: {
  token: string
  onSignOut: () => void
}) {
  const [period, setPeriod] = useState(() => monthBounds(currentMonth()))
  const { from, to } = period
  const [snapshots, setSnapshots] = useState<SnapshotResponse[]>([])
  const [status, setStatus] = useState<"loading" | "empty" | "ready" | "error">(
    "loading",
  )

  const request = useRef(0)

  const load = useCallback(async () => {
    const id = ++request.current
    const result = await fetchRange(token, from, to)
    if (id !== request.current) return
    if (result.kind === "unauthorized") {
      onSignOut()
      return
    }
    if (result.kind === "empty") {
      setSnapshots([])
      setStatus("empty")
      return
    }
    if (result.kind === "error") {
      setStatus("error")
      return
    }
    setSnapshots(result.snapshots)
    setStatus("ready")
  }, [from, onSignOut, to, token])

  useEffect(() => {
    void load()
    const onFocus = () => {
      void load()
    }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [load])

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="flex items-center gap-2 text-xl font-medium">
            <Wallet />
            Family Wallet
          </h1>
          <p className="text-sm text-muted-foreground">
            Retrato enviado pelo Aurum. A tela não recalcula o mês.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()}>
            <RefreshCw data-icon="inline-start" />
            Atualizar
          </Button>
          <Button variant="ghost" onClick={onSignOut}>
            <LogOut data-icon="inline-start" />
            Sair
          </Button>
        </div>
      </header>

      <PeriodBar
        from={from}
        to={to}
        onChange={(nextFrom, nextTo) => setPeriod({ from: nextFrom, to: nextTo })}
        onShift={(delta) =>
          setPeriod((current) =>
            monthBounds(shiftMonth(monthKey(current.from), delta)),
          )
        }
      />

      {status === "loading" ? <Loading /> : null}
      {status === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>A API não respondeu</AlertTitle>
          <AlertDescription>
            Confira se o servidor está no ar e tente de novo.
          </AlertDescription>
        </Alert>
      ) : null}
      {status === "empty" ? <Waiting /> : null}
      {status === "ready"
        ? snapshots.map((body) => (
            <Month key={body.snapshot.month} body={body} from={from} to={to} />
          ))
        : null}
    </main>
  )
}

function Loading() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Skeleton className="h-36" />
      <Skeleton className="h-36" />
      <Skeleton className="h-36" />
    </div>
  )
}

function Waiting() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Wallet />
        </EmptyMedia>
        <EmptyTitle>Nenhum retrato neste período</EmptyTitle>
        <EmptyDescription>
          Troque o mês ou espere o Aurum enviar o retrato desse intervalo.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function PeriodBar({
  from,
  to,
  onChange,
  onShift,
}: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
  onShift: (delta: number) => void
}) {
  const month = monthKey(from)
  const label = isFullMonth(from, to)
    ? formatMonth(month)
    : `${formatDate(from)} – ${formatDate(to)}`
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>(() => ({
    from: parseIsoDate(from),
    to: parseIsoDate(to),
  }))
  const picks = useRef(0)

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Mês anterior"
          onClick={() => onShift(-1)}
        >
          <ChevronLeft />
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const bounds = monthBounds(month)
            onChange(bounds.from, bounds.to)
          }}
        >
          {label}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Próximo mês"
          onClick={() => onShift(1)}
        >
          <ChevronRight />
        </Button>
      </div>
      <Field className="w-auto">
        <FieldLabel htmlFor="report-range">Período</FieldLabel>
        <Popover
          open={open}
          onOpenChange={(next) => {
            if (next) {
              picks.current = 0
              setDraft({ from: parseIsoDate(from), to: parseIsoDate(to) })
            }
            setOpen(next)
          }}
        >
          <PopoverTrigger asChild>
            <Button
              id="report-range"
              type="button"
              variant="outline"
              className="justify-start font-normal"
            >
              <CalendarIcon data-icon="inline-start" />
              {formatDate(from)} – {formatDate(to)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              resetOnSelect
              locale={ptBR}
              defaultMonth={parseIsoDate(from)}
              selected={draft}
              onSelect={(range) => {
                picks.current += 1
                setDraft(range)
                if (!range?.from || !range.to) return
                onChange(formatIsoDate(range.from), formatIsoDate(range.to))
                if (picks.current > 1) setOpen(false)
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </Field>
    </div>
  )
}

function Month({
  body,
  from,
  to,
}: {
  body: SnapshotResponse
  from: string
  to: string
}) {
  const { snapshot } = body
  const chartRows = orderedBoxes(snapshot.boxes).map((box) => ({
    name: labelOf(box.id),
    used: boxUsed(box, true),
    ceiling: displayCeiling(box, snapshot.model?.ceilings),
  }))
  const showSubbox = snapshot.transactions.some((item) =>
    Boolean(item.subbox && inRange(item.date, from, to)),
  )
  const commitments = snapshot.commitments
    .filter((item) => inRange(item.date, from, to))
    .sort((a, b) => {
      if (a.paid !== b.paid) return a.paid ? 1 : -1
      return a.date.localeCompare(b.date)
    })
  const transactions = snapshot.transactions
    .filter((item) => inRange(item.date, from, to))
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        {snapshot.month} · posição em {formatDate(snapshot.as_of)} · recebido{" "}
        {formatDateTime(body.received_at)}
      </p>

      <FourBoxes snapshot={snapshot} />

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Renda</CardTitle>
            <CardDescription>Recebida neste mês</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-2xl font-medium">
              {formatBRL(snapshot.income.received)}
            </p>
            <Progress
              value={percent(snapshot.income.received, snapshot.income.expected)}
            />
            <p className="text-sm text-muted-foreground">
              de {formatBRL(snapshot.income.expected)} previstos
            </p>
            {snapshot.income.sources?.length ? (
              <ul className="flex flex-col gap-2 text-sm">
                {snapshot.income.sources.map((source, index) => (
                  <li key={`${source.name}-${index}`} className="flex flex-col gap-1">
                    <span className="flex items-center justify-between gap-2">
                      <span>{source.name}</span>
                      <span className="font-medium tabular-nums">
                        {formatBRL(source.amount)}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2 text-muted-foreground">
                      <Badge variant={source.received ? "success" : "outline"}>
                        {source.received ? "Recebido" : "Pendente"}
                      </Badge>
                      {source.expected_date ? (
                        <span>{formatDate(source.expected_date)}</span>
                      ) : null}
                      {source.note ? <span>{source.note}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>
      </section>

      {chartRows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Caixinhas</CardTitle>
            <CardDescription>Usado ou guardado e teto</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
              <BarChart data={chartRows}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <span>
                          {String(name)}: {formatBRL(Number(value))}
                        </span>
                      )}
                    />
                  }
                />
                <Bar dataKey="used" fill="var(--color-used)" radius={4} />
                <Bar dataKey="ceiling" fill="var(--color-ceiling)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Compromissos</CardTitle>
          <CardDescription>O que este retrato marca no mês</CardDescription>
        </CardHeader>
        <CardContent>
          {commitments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum compromisso.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Caixinha</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commitments.map((item) => (
                  <TableRow key={`${item.date}-${item.name}`}>
                    <TableCell>
                      <span className="block">{formatDate(item.date)}</span>
                      {item.date_approx ? (
                        <span className="text-xs text-muted-foreground">aproximada</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <span className="block">{item.name}</span>
                      {item.box === "necessidades" && item.subbox ? (
                        <span className="text-xs text-muted-foreground">
                          {labelOf(item.subbox)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>{labelOf(item.box)}</TableCell>
                    <TableCell>{formatBRL(item.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={item.paid ? "secondary" : "outline"}>
                        {item.paid ? "Pago" : "A pagar"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cartões</CardTitle>
          <CardDescription>
            Fatura deste mês e os seis meses seguintes
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {snapshot.cards.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cartão.</p>
          ) : (
            <>
              <CardForecast cards={snapshot.cards} month={snapshot.month} />
              <div className="grid gap-4 md:grid-cols-2">
                {snapshot.cards.map((card) => (
              <div key={card.name} className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{card.name}</p>
                  <p>{formatBRL(card.statement ?? 0)}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Fecha dia {card.closing_day ?? "—"} · vence dia{" "}
                  {card.due_day ?? "—"}
                </p>
                {typeof card.limit === "number" ? (
                  <p className="text-sm text-muted-foreground">
                    Limite {formatBRL(card.limit)}
                  </p>
                ) : null}
                <AuthorshipShare card={card} month={snapshot.month} />
                {visibleInstallments(card, from, to).length ? (
                  <ul className="flex flex-col gap-2 text-sm">
                    {visibleInstallments(card, from, to).map((item, index) => (
                      <li
                        key={`${card.name}-${index}`}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="flex flex-wrap items-center gap-2">
                          <span>{item.description ?? "Parcela"}</span>
                          {parcelText(item) ? (
                            <span className="font-medium">{parcelText(item)}</span>
                          ) : null}
                          {isLastParcel(item) ? (
                            <Badge variant="success">última</Badge>
                          ) : null}
                        </span>
                        <span>{formatBRL(item.amount)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem parcelas abertas.</p>
                )}
              </div>
            ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <CategoryRadars transactions={transactions} month={snapshot.month} />

      <Card>
        <CardHeader>
          <CardTitle>Lançamentos</CardTitle>
          <CardDescription>Como vieram no JSON</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum lançamento.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Caixinha</TableHead>
                  {showSubbox ? <TableHead>Subcaixinha</TableHead> : null}
                  <TableHead>Categoria</TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((item, index) => (
                  <TableRow key={`${item.date}-${item.category}-${index}`}>
                    <TableCell>{formatDate(item.date)}</TableCell>
                    <TableCell>{labelOf(item.box)}</TableCell>
                    {showSubbox ? (
                      <TableCell>{item.subbox ? labelOf(item.subbox) : ""}</TableCell>
                    ) : null}
                    <TableCell>{labelOf(item.category)}</TableCell>
                    <TableCell>{item.note ?? ""}</TableCell>
                    <TableCell>{formatBRL(item.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {typeof snapshot.notes === "string" && snapshot.notes.trim() ? (
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{snapshot.notes}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
