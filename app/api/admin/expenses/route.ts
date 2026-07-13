import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

async function requireAdmin(userId: string) {
  const employee = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!employee || (employee.role !== 'ADMIN' && employee.role !== 'MANAGER')) return null
  return employee
}

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const month  = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined
  const year   = searchParams.get('year')  ? parseInt(searchParams.get('year')!)  : undefined

  const expenses = await db.expense.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(month || year ? {
        date: {
          gte: month && year ? new Date(year, month - 1, 1) : undefined,
          lte: month && year ? new Date(year, month, 0)     : undefined,
        },
      } : {}),
    },
    include: {
      employee: { include: { department: { select: { name: true } } } },
      project:  { select: { id: true, name: true } },
    },
    orderBy: [{ submittedAt: 'desc' }, { date: 'desc' }],
  })

  return NextResponse.json(expenses)
}

// PUT — avançar despesas aprovadas no fluxo financeiro: APPROVED -> PROCESSING -> PAID
// (mesmo padrão do Payroll em app/api/admin/payroll/route.ts)
const statusSchema = z.object({
  id:     z.string(),
  status: z.enum(['PROCESSING', 'PAID']),
})

export async function PUT(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body   = await req.json()
  const parsed = statusSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { id, status } = parsed.data

  const existing = await db.expense.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Despesa não encontrada' }, { status: 404 })
  if (status === 'PROCESSING' && existing.status !== 'APPROVED') {
    return NextResponse.json({ error: 'Só é possível processar despesas aprovadas.' }, { status: 409 })
  }
  if (status === 'PAID' && existing.status !== 'PROCESSING') {
    return NextResponse.json({ error: 'Só é possível marcar como paga uma despesa em processamento.' }, { status: 409 })
  }

  const expense = await db.expense.update({
    where: { id },
    data:  {
      status,
      processedAt: status === 'PROCESSING' || status === 'PAID' ? new Date() : undefined,
      paidAt:      status === 'PAID' ? new Date() : undefined,
    },
    include: {
      employee: { include: { department: { select: { name: true } } } },
      project:  { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(expense)
}
