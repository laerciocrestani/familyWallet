import { z } from "zod"

const money = z.number().finite()
const day = z.number().int().min(1).max(31)
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const childSchema = z.looseObject({
  id: z.string().min(1),
  planned: money,
  done: money,
})

const subboxSchema = z.looseObject({
  key: z.string().min(1),
  name: z.string().optional(),
  ceiling: money.optional(),
  committed: money.optional(),
  spent: money.optional(),
  free: money.optional(),
})

const boxSchema = z.looseObject({
  id: z.string().min(1),
  ceiling: money.optional(),
  spent: money.optional(),
  committed: money.optional(),
  projected_over: money.optional(),
  free: money.optional(),
  allocated: money.optional(),
  weekly: z
    .looseObject({
      budget: money,
      spent: money,
      week_start: isoDate.optional(),
      week_end: isoDate.optional(),
    })
    .optional(),
  children: z.array(childSchema).optional(),
  subboxes: z.array(subboxSchema).optional(),
})

const commitmentSchema = z.looseObject({
  date: isoDate,
  name: z.string().min(1),
  amount: money,
  box: z.string().min(1),
  paid: z.boolean(),
  subbox: z.string().optional(),
  date_approx: z.boolean().optional(),
})

const installmentSchema = z.looseObject({
  amount: money,
  description: z.string().optional(),
  date: isoDate.optional(),
  index: z.number().int().positive().optional(),
  count: z.number().int().positive().optional(),
  remaining: z.number().int().nonnegative().optional(),
})

const cardSchema = z.looseObject({
  name: z.string().min(1),
  closing_day: day.optional(),
  due_day: day.optional(),
  statement: money.optional(),
  limit: money.nullish(),
  installments_open: z.array(installmentSchema).optional(),
})

const transactionSchema = z.looseObject({
  date: isoDate,
  box: z.string().min(1),
  category: z.string().min(1),
  amount: money,
  note: z.string().optional(),
  subbox: z.string().optional(),
})

export const snapshotSchema = z.looseObject({
  as_of: isoDate,
  month: z.string().regex(/^\d{4}-\d{2}$/),
  income: z.looseObject({
    expected: money,
    received: money,
    sources: z
      .array(
        z.looseObject({
          name: z.string().min(1),
          amount: money,
          expected_date: z.union([isoDate, z.null()]).optional(),
          received: z.boolean().optional(),
          note: z.string().optional(),
        }),
      )
      .optional(),
  }),
  boxes: z.array(boxSchema),
  commitments: z.array(commitmentSchema),
  cards: z.array(cardSchema),
  transactions: z.array(transactionSchema),
  notes: z.unknown().optional(),
  model: z
    .looseObject({
      name: z.string().optional(),
      since: z.string().optional(),
      income_reference: money.optional(),
      income: money.optional(),
      percentages: z
        .looseObject({
          necessidades: money.optional(),
          desejos: money.optional(),
          seguranca: money.optional(),
          futuro: money.optional(),
        })
        .optional(),
      ceilings: z
        .looseObject({
          necessidades: money.optional(),
          desejos: money.optional(),
          seguranca: money.optional(),
          futuro: money.optional(),
        })
        .optional(),
      rule: z.string().optional(),
    })
    .optional(),
})

export type Snapshot = z.infer<typeof snapshotSchema>

export function snapshotIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }))
}
