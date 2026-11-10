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

A tela sobe em `http://127.0.0.1:5173` e a API em `http://127.0.0.1:8788`. No navegador, informe o mesmo token. Ele fica só na aba.

## Docker

Na máquina local:

```bash
cp .env.example .env
# edite AURUM_TOKEN
docker compose up -d --build
```

Abra `http://127.0.0.1:8788`. O container escuta em `0.0.0.0:8788` e a porta publicada fica só em `127.0.0.1`. O SQLite fica no volume `family_data`.

Na Oracle o app sobe no container próprio `family-wallet`, na rede `web` que já existe. Cada push em `main` roda o Action `.github/workflows/deploy.yml`: testa, constrói a imagem arm64 e a VPS só faz o pull. A porta do app continua em `127.0.0.1:8788`.

O endereço público é `https://familywallet.pidia.com.br`. O Caddy em `proxy/` (`family-proxy`, rede do host) encaminha esse nome para `127.0.0.1:8788`. O firewall da máquina aceita 80 e 443 só dos IPs da Cloudflare. A security list da Oracle precisa deixar essas duas portas chegarem na VPS. O certificado em `proxy/certs/` fica só na máquina.

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
    {
      "name": "Inter",
      "closing_day": 1,
      "due_day": 8,
      "statement": 0,
      "installments_open": [
        { "description": "geladeira", "amount": 180, "index": 3, "count": 6 },
        { "description": "sofá", "amount": 90, "index": 6, "count": 6 }
      ]
    }
  ],
  "transactions": [
    { "date": "2026-11-03", "box": "necessidades", "category": "mercado", "amount": 0, "note": "" }
  ]
}
```

`as_of` tem de cair dentro de `month`. Campos extras são guardados. Em cada parcela, `index` é a parcela atual e `count` é o total: a tela mostra `3/6`. Quando os dois são iguais, a parcela ganha a tag verde "última". A tela também lê `GET /api/aurum/snapshot?from=AAAA-MM-DD&to=AAAA-MM-DD` e devolve o último retrato de cada mês do intervalo.

```bash
curl -s -X POST http://127.0.0.1:8788/api/aurum/snapshot \
  -H "Authorization: Bearer $AURUM_TOKEN" \
  -H "Content-Type: application/json" \
  -d @snapshot.json
```
