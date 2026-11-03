import { useState, type FormEvent } from "react"
import { Wallet } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { fetchSnapshot, TOKEN_KEY } from "@/lib/api"

export function Gate({ onReady }: { onReady: (token: string) => void }) {
  const [token, setToken] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = token.trim()
    if (!next) return
    setPending(true)
    setError(null)
    const result = await fetchSnapshot(next)
    setPending(false)
    if (result.kind === "unauthorized") {
      setError("Token recusado.")
      return
    }
    if (result.kind === "error") {
      setError("Não consegui falar com a API.")
      return
    }
    sessionStorage.setItem(TOKEN_KEY, next)
    onReady(next)
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet />
            Family Wallet
          </CardTitle>
          <CardDescription>
            O painel lê o retrato que o Aurum envia. O token fica só nesta aba.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={submit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="token">Token</FieldLabel>
                <Input
                  id="token"
                  type="password"
                  autoComplete="current-password"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  required
                />
                <FieldDescription>
                  O mesmo valor de AURUM_TOKEN no servidor.
                </FieldDescription>
              </Field>
            </FieldGroup>
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Não entrou</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Conferindo…" : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
