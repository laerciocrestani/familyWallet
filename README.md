# Family Wallet

Painel do mês da família. O Aurum, no Grok Bot, continua sendo quem lança e calcula. Este app guarda o JSON que ele envia e desenha caixinhas, ritmo semanal, compromissos, cartões e lançamentos.

## Stack

Vite, React, TypeScript, Tailwind, shadcn/ui, Recharts, Hono e SQLite (`node:sqlite`). Precisa de Node 22.

## Rodar

```bash
cp .env.example .env
# edite AURUM_TOKEN
pnpm install
pnpm dev
```

A tela sobe em `http://127.0.0.1:5173` e a API em `http://127.0.0.1:8787`. No navegador, informe o mesmo token. Ele fica só na aba.

## Docker

Na máquina local:

```bash
cp .env.example .env
# edite AURUM_TOKEN
docker compose up -d --build
```

Abra `http://127.0.0.1:8787`. O container escuta em `0.0.0.0:8787` e a porta publicada fica só em `127.0.0.1`. O SQLite fica no volume `family_data`.

Na Oracle o app sobe no container próprio `family-wallet`, na rede `web` que já existe. Cada push em `main` roda o Action `.github/workflows/deploy.yml`: testa, envia o código e executa `docker compose -f docker-compose.yml -f docker-compose.oracle.yml up -d --build`. A imagem é arm64, construída na VPS. A porta publicada lá também é `127.0.0.1:8787`.

`HOST` e `DATA_DIR` do `.env` valem para `pnpm dev` e `pnpm start`. Dentro do Compose eles são `0.0.0.0` e `/data`.

## Rotas

| Método | Caminho | Auth |
|---|---|---|
| `GET` | `/api/health` | não |
| `POST` | `/api/aurum/snapshot` | `Authorization: Bearer <token>` |
| `GET` | `/api/aurum/snapshot` | o mesmo token |
| `GET` | `/api/aurum/snapshot?month=2026-11` | o mesmo token |

Cada POST grava o mês inteiro. O GET sem mês devolve o envio mais recente. O GET com `month` devolve o último daquele mês. A tela não refaz teto, parcela nem projeção.

## O que pedir ao Aurum

Quando o endereço estiver no ar, mande no chat do Aurum:

1. A URL, por exemplo `https://seu-servidor/api/aurum/snapshot`.
2. O header `Authorization: Bearer …`.
3. O formato abaixo.
4. Enviar o mês inteiro de manhã, com o relatório, e de novo depois de cada lançamento. Se o POST falhar, avisar na conversa.

```json
{
  "as_of": "2026-11-03",
  "month": "2026-11",
  "income": { "expected": 0, "received": 0 },
  "boxes": [
    {
      "id": "necessidades",
      "ceiling": 0,
      "spent": 0,
      "projected_over": 0,
      "free": 0,
      "weekly": { "budget": 0, "spent": 0 }
    },
    { "id": "desejos", "ceiling": 0, "spent": 0, "free": 0 },
    {
      "id": "futuro",
      "ceiling": 0,
      "allocated": 0,
      "children": [
        { "id": "amortizacao_apto", "planned": 0, "done": 0 },
        { "id": "reserva", "planned": 0, "done": 0 }
      ]
    }
  ],
  "commitments": [
    { "date": "2026-11-10", "name": "condominio", "amount": 0, "box": "necessidades", "paid": false }
  ],
  "cards": [
    { "name": "Inter", "closing_day": 1, "due_day": 8, "statement": 0, "installments_open": [] }
  ],
  "transactions": [
    { "date": "2026-11-03", "box": "necessidades", "category": "mercado", "amount": 0, "note": "" }
  ]
}
```

`as_of` tem de cair dentro de `month`. Campos extras são guardados.

```bash
curl -s -X POST http://127.0.0.1:8787/api/aurum/snapshot \
  -H "Authorization: Bearer $AURUM_TOKEN" \
  -H "Content-Type: application/json" \
  -d @snapshot.json
```
