import { useCallback, useEffect, useState } from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { LogOut, RefreshCw, Wallet } from "lucide-react"
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
import { fetchSnapshot, type SnapshotResponse } from "@/lib/api"
import { labelOf } from "@/lib/labels"
import { formatBRL, formatDate, formatDateTime } from "@/lib/money"

const chartConfig = {
  used: { label: "No mês", color: "var(--chart-1)" },
  ceiling: { label: "Teto", color: "var(--chart-2)" },
} satisfies ChartConfig

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
  const [body, setBody] = useState<SnapshotResponse | null>(null)
  const [status, setStatus] = useState<"loading" | "empty" | "ready" | "error">(
    "loading",
  )

  const load = useCallback(async () => {
    const result = await fetchSnapshot(token)
    if (result.kind === "unauthorized") {
      onSignOut()
      return
    }
    if (result.kind === "empty") {
      setBody(null)
      setStatus("empty")
      return
    }
    if (result.kind === "error") {
      setStatus("error")
      return
    }
    setBody(result.body)
    setStatus("ready")
  }, [onSignOut, token])

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
      {status === "ready" && body ? <Month body={body} /> : null}
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
        <EmptyTitle>Nenhum retrato ainda</EmptyTitle>
        <EmptyDescription>
          Quando o Aurum fizer o primeiro POST em /api/aurum/snapshot, o mês
          aparece aqui.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function Month({ body }: { body: SnapshotResponse }) {
  const { snapshot } = body
  const weekly = snapshot.boxes.find((box) => box.weekly)?.weekly
  const chartRows = snapshot.boxes.map((box) => ({
    name: labelOf(box.id),
    used: box.spent ?? box.allocated ?? 0,
    ceiling: box.ceiling ?? 0,
  }))
  const commitments = [...snapshot.commitments].sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1
    return a.date.localeCompare(b.date)
  })
  const transactions = [...snapshot.transactions].sort((a, b) =>
    b.date.localeCompare(a.date),
  )

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        {snapshot.month} · posição em {formatDate(snapshot.as_of)} · recebido{" "}
        {formatDateTime(body.received_at)}
      </p>

      <section className="grid gap-4 lg:grid-cols-4">
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
          </CardContent>
        </Card>
        {snapshot.boxes.map((box) => {
          const used = box.spent ?? box.allocated ?? 0
          const ceiling = box.ceiling ?? 0
          const over = (box.projected_over ?? 0) > 0 || (ceiling > 0 && used > ceiling)
          return (
            <Card key={box.id}>
              <CardHeader>
                <CardTitle>{labelOf(box.id)}</CardTitle>
                <CardDescription>
                  {box.free != null
                    ? `${formatBRL(box.free)} livres`
                    : "Sem saldo livre neste retrato"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-2xl font-medium">{formatBRL(used)}</p>
                  {over ? <Badge variant="destructive">acima</Badge> : null}
                </div>
                <Progress value={percent(used, ceiling)} />
                <p className="text-sm text-muted-foreground">
                  teto {formatBRL(ceiling)}
                </p>
                {box.children?.length ? (
                  <ul className="flex flex-col gap-1 text-sm">
                    {box.children.map((child) => (
                      <li key={child.id} className="flex justify-between gap-2">
                        <span>{labelOf(child.id)}</span>
                        <span className="text-muted-foreground">
                          {formatBRL(child.done)} / {formatBRL(child.planned)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CardContent>
            </Card>
          )
        })}
      </section>

      {weekly ? (
        <Card>
          <CardHeader>
            <CardTitle>Ritmo da semana</CardTitle>
            <CardDescription>
              {formatBRL(weekly.spent)} de {formatBRL(weekly.budget)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Progress value={percent(weekly.spent, weekly.budget)} />
          </CardContent>
        </Card>
      ) : null}

      {chartRows.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Caixinhas</CardTitle>
            <CardDescription>Usado no mês e teto</CardDescription>
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
                    <TableCell>{formatDate(item.date)}</TableCell>
                    <TableCell>{item.name}</TableCell>
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
          <CardDescription>Fatura e parcelas abertas</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {snapshot.cards.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cartão.</p>
          ) : (
            snapshot.cards.map((card) => (
              <div key={card.name} className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{card.name}</p>
                  <p>{formatBRL(card.statement ?? 0)}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Fecha dia {card.closing_day ?? "—"} · vence dia{" "}
                  {card.due_day ?? "—"}
                </p>
                {card.installments_open?.length ? (
                  <ul className="flex flex-col gap-1 text-sm">
                    {card.installments_open.map((item, index) => (
                      <li key={`${card.name}-${index}`} className="flex justify-between gap-2">
                        <span>{item.description ?? "Parcela"}</span>
                        <span>
                          {formatBRL(item.amount)}
                          {item.remaining != null ? ` · ${item.remaining}x` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem parcelas abertas.</p>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

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
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.note ?? ""}</TableCell>
                    <TableCell>{formatBRL(item.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
