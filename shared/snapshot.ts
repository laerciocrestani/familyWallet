import { z } from "zod"

const money = z.number().finite()
const day = z.number().int().min(1).max(31)
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const childSchema = z.looseObject({
  id: z.string().min(1),
  planned: money,
  done: money,
})

const boxSchema = z.looseObject({
  id: z.string().min(1),
  ceiling: money.optional(),
  spent: money.optional(),
  projected_over: money.optional(),
  free: money.optional(),
  allocated: money.optional(),
  weekly: z
    .looseObject({
      budget: money,
      spent: money,
    })
    .optional(),
  children: z.array(childSchema).optional(),
})

const commitmentSchema = z.looseObject({
  date: isoDate,
  name: z.string().min(1),
  amount: money,
  box: z.string().min(1),
  paid: z.boolean(),
})

const installmentSchema = z.looseObject({
  amount: money,
  description: z.string().optional(),
  remaining: z.number().int().nonnegative().optional(),
})

const cardSchema = z.looseObject({
  name: z.string().min(1),
  closing_day: day.optional(),
  due_day: day.optional(),
  statement: money.optional(),
  installments_open: z.array(installmentSchema).optional(),
})

const transactionSchema = z.looseObject({
  date: isoDate,
  box: z.string().min(1),
  category: z.string().min(1),
  amount: money,
  note: z.string().optional(),
})

export const snapshotSchema = z.looseObject({
  as_of: isoDate,
  month: z.string().regex(/^\d{4}-\d{2}$/),
  income: z.looseObject({
    expected: money,
    received: money,
  }),
  boxes: z.array(boxSchema),
  commitments: z.array(commitmentSchema),
  cards: z.array(cardSchema),
  transactions: z.array(transactionSchema),
})

export type Snapshot = z.infer<typeof snapshotSchema>

export function snapshotIssues(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }))
}
