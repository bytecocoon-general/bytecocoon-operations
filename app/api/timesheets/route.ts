import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { timesheetSchema } from '@/lib/validators'

const linesInclude = { orderBy: { date: 'asc' as const }, include: { project: { select: { name: true } } } }

// GET — buscar timesheet do mês/ano
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get('month') ?? '')
  const year  = parseInt(searchParams.get('year')  ?? '')

  if (!month || !year) return NextResponse.json({ error: 'Mês e ano obrigatórios' }, { status: 400 })

  const employee = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!employee) return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })

  const timesheet = await db.timesheet.findUnique({
    where:   { employeeId_month_year: { employeeId: employee.id, month, year } },
    include: { lines: linesInclude },
  })

  return NextResponse.json(timesheet ?? null)
}

// POST — criar timesheet
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const employee = await db.employee.findUnique({ where: { clerkId: userId } })
    if (!employee) return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })

    const body   = await req.json()
    const parsed = timesheetSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const existing = await db.timesheet.findUnique({
      where: { employeeId_month_year: { employeeId: employee.id, month: parsed.data.month, year: parsed.data.year } }
    })
    if (existing) return NextResponse.json({ error: 'Já existe timesheet para este mês' }, { status: 409 })

    const timesheet = await db.timesheet.create({
      data: {
        employeeId: employee.id,
        month:      parsed.data.month,
        year:       parsed.data.year,
        lines:      { create: parsed.data.lines },
      },
      include: { lines: linesInclude },
    })

    return NextResponse.json(timesheet, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PUT — guardar rascunho (actualizar linhas)
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const employee = await db.employee.findUnique({ where: { clerkId: userId } })
    if (!employee) return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })

    const body   = await req.json()
    const parsed = timesheetSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const existing = await db.timesheet.findUnique({
      where: { employeeId_month_year: { employeeId: employee.id, month: parsed.data.month, year: parsed.data.year } }
    })
    if (!existing) return NextResponse.json({ error: 'Timesheet não encontrada' }, { status: 404 })
    if (existing.status === 'SUBMITTED') return NextResponse.json({ error: 'Não é possível editar uma timesheet submetida.' }, { status: 409 })
    if (existing.status === 'APPROVED')  return NextResponse.json({ error: 'Não é possível editar uma timesheet aprovada.' }, { status: 409 })

    await db.timesheetLine.deleteMany({ where: { timesheetId: existing.id } })

    const newStatus = existing.status === 'REJECTED' ? 'DRAFT' : existing.status

    const timesheet = await db.timesheet.update({
      where: { id: existing.id },
      data:  {
        status:     newStatus,
        reviewNote: existing.status === 'REJECTED' ? null : undefined,
        lines:      { create: parsed.data.lines },
      },
      include: { lines: linesInclude },
    })

    return NextResponse.json(timesheet)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
