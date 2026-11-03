# Family Wallet

**Vision:** Um painel web do mês da família, alimentado pelo agente Aurum do Grok Bot.
**For:** Laércio, no controle visual das finanças da família.
**Solves:** O chat e o e-mail da manhã não dão uma leitura estável de caixinhas, vencimentos e faturas.

## Goals

- Ver o último retrato do mês em uma tela, com as mesmas caixinhas que o Aurum já usa.
- Receber esse retrato por POST autenticado, sem um segundo cálculo de saldo.

## Tech Stack

**Core:**

- Framework: Vite + React 19
- Language: TypeScript
- API: Hono no Node 22
- Database: SQLite (`node:sqlite`)

**Key dependencies:** Tailwind 4, shadcn/ui, Recharts, Zod

## Scope

**v1 includes:**

- `POST /api/aurum/snapshot` e `GET /api/aurum/snapshot`
- Bearer token
- Tela com renda, caixinhas, ritmo semanal, compromissos, cartões e lançamentos

**Explicitly out of scope:**

- O ledger do Aurum em Hermes (`projects/agents/aurum`)
- Recalcular teto, parcela ou projeção na tela
- Formulário de lançamento
- Open Finance

## Constraints

- Technical: o Aurum do Grok Bot é a fonte. O painel só guarda e mostra o JSON.
- Resources: um servidor com Node 22. O token não entra no bundle da tela.
