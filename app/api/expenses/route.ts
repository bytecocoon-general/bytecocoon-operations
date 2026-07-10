import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { expenseSchema } from '@/lib/validators'

const expenseInclude = {
  project:  { select: { id: true, name: true } },
  employee: { select: { id: true, name: true } },
}

// GET — próprias despesas
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const employee = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!employee) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // DRAFT | SUBMITTED | APPROVED | REJECTED | null (todas)

  const expenses = await db.expense.findMany({
    where: {
      employeeId: employee.id,
      ...(status ? { status } : {}),
    },
    include: expenseInclude,
    orderBy: { date: 'desc' },
  })

  return NextResponse.json(expenses)
}

// POST — criar despesa (DRAFT)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const employee = await db.employee.findUnique({ where: { clerkId: userId } })
    if (!employee) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    const body   = await req.json()
    const parsed = expenseSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const expense = await db.expense.create({
      data: {
        employeeId:  employee.id,
        projectId:   parsed.data.projectId ?? null,
        date:        new Date(parsed.data.date + 'T00:00:00.000Z'),
        category:    parsed.data.category,
        amount:      parsed.data.amount,
        description: parsed.data.description ?? null,
        status:      'DRAFT',
      },
      include: expenseInclude,
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
