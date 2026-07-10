import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { payrollSchema } from '@/lib/validators'
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
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined
  const year  = searchParams.get('year')  ? parseInt(searchParams.get('year')!)  : undefined

  const payrolls = await db.payroll.findMany({
    where: {
      ...(month ? { month } : {}),
      ...(year  ? { year }  : {}),
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }, { employee: { name: 'asc' } }],
    include: {
      employee: {
        include: { department: true },
      },
    },
  })
  return NextResponse.json(payrolls)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body   = await req.json()
  const parsed = payrollSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { employeeId, month, year, deductions, notes } = parsed.data

  const existing = await db.payroll.findUnique({ where: { employeeId_month_year: { employeeId, month, year } } })
  if (existing) return NextResponse.json({ error: 'Payroll já existe para este funcionário neste mês.' }, { status: 409 })

  const employee = await db.employee.findUnique({ where: { id: employeeId } })
  if (!employee) return NextResponse.json({ error: 'Funcionário não encontrado.' }, { status: 404 })

  // Calcular a partir da timesheet aprovada
  const timesheet = await db.timesheet.findUnique({
    where:   { employeeId_month_year: { employeeId, month, year } },
    include: { lines: true },
  })

  let regularHours  = 0
  let overtimeHours = 0
  let expensesTotal = 0

  if (timesheet?.status === 'APPROVED') {
    for (const line of timesheet.lines) {
      if (line.type === 'WORK') {
        regularHours  += Number(line.hours)
        overtimeHours += Number(line.extraHours)
      }
    }
    // Sum approved standalone expenses for this employee/month/year
    const expAgg = await db.expense.aggregate({
      where: {
        employeeId,
        status: 'APPROVED',
        date: {
          gte: new Date(year, month - 1, 1),
          lte: new Date(year, month, 0),
        },
      },
      _sum: { amount: true },
    })
    expensesTotal = Number(expAgg._sum?.amount ?? 0)
  }

  const hourlyRate = Number(employee.hourlyRate)
  const grossPay   = regularHours * hourlyRate + overtimeHours * hourlyRate * 1.5
  const netPay     = grossPay + expensesTotal - (deductions ?? 0)

  const payroll = await db.payroll.create({
    data: {
      employeeId,
      month,
      year,
      regularHours,
      overtimeHours,
      hourlyRate,
      grossPay,
      expensesTotal,
      deductions: deductions ?? 0,
      netPay,
      notes,
    },
    include: { employee: { include: { department: true } } },
  })

  return NextResponse.json(payroll, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body   = await req.json()
  const parsed = z.object({
    id:     z.string(),
    status: z.enum(['DRAFT', 'PROCESSED', 'PAID']),
    notes:  z.string().max(500).optional().nullable(),
    paidAt: z.string().optional().nullable(),
  }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { id, status, notes, paidAt } = parsed.data
  const payroll = await db.payroll.update({
    where: { id },
    data:  {
      status,
      notes,
      processedAt: status === 'PROCESSED' || status === 'PAID' ? new Date() : undefined,
      paidAt:      paidAt ? new Date(paidAt) : (status === 'PAID' ? new Date() : undefined),
    },
    include: { employee: { include: { department: true } } },
  })
  return NextResponse.json(payroll)
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const payroll = await db.payroll.findUnique({ where: { id } })
  if (payroll?.status === 'PAID') return NextResponse.json({ error: 'Não pode apagar um payroll já pago.' }, { status: 400 })

  await db.payroll.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
