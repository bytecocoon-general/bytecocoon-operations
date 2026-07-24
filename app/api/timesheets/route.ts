import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { timesheetSchema } from '@/lib/validators'
import { getCurrentEmployee, canActOnBehalfOf } from '@/lib/auth'
import { z } from 'zod'

const timesheetInclude = {
  lines: { orderBy: { date: 'asc' as const }, include: { project: { select: { name: true } } } },
}

async function compensationData(employeeId: string, data: z.infer<typeof timesheetSchema>) {
  const employee = await db.employee.findUnique({ where: { id: employeeId }, include: { projectMemberships: true } })
  if (!employee) throw new Error('EMPLOYEE_NOT_FOUND')
  const membershipIds = new Set(employee.projectMemberships.map(item => item.projectId))
  const internationalDays = new Set<string>()
  const lines = data.lines.map(line => {
    if (line.projectId && !membershipIds.has(line.projectId)) throw new Error('PROJECT_NOT_ASSIGNED')
    if (line.type !== 'INTERNATIONAL_TRAVEL') return line
    if (!line.projectId) throw new Error('INTERNATIONAL_PROJECT_REQUIRED')
    const day = line.date.substring(0, 10)
    if (internationalDays.has(day)) throw new Error('DUPLICATE_INTERNATIONAL_DAY')
    internationalDays.add(day)
    const membership = line.projectId ? employee.projectMemberships.find(item => item.projectId === line.projectId) : null
    const perDiemRate = membership?.perDiemRate != null ? Number(membership.perDiemRate) : Number(employee.perDiemRate)
    return { ...line, hours: 0, extraHours: 0, overtimeMultiplier: null, perDiemRate, perDiemAmount: perDiemRate }
  })
  return lines
}

function internalError(error: unknown) {
  const messages: Record<string, string> = {
    PROJECT_NOT_ASSIGNED: 'Só pode selecionar projetos atribuídos ao colaborador.',
    INTERNATIONAL_PROJECT_REQUIRED: 'A deslocação internacional tem de estar associada a um projeto.',
    DUPLICATE_INTERNATIONAL_DAY: 'Só pode existir uma deslocação internacional por dia.',
  }
  const code = error instanceof Error ? error.message : ''
  if (messages[code]) return NextResponse.json({ error: messages[code] }, { status: 400 })
  console.error(error)
  return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
}

// Resolve o colaborador-alvo (dono da timesheet) e confirma que o actor tem permissão sobre ele.
// requestedEmployeeId omitido => o próprio actor.
async function resolveTarget(actor: { id: string; role: string }, requestedEmployeeId: string | undefined) {
  if (!requestedEmployeeId || requestedEmployeeId === actor.id) return { id: actor.id, ok: true as const }

  const target = await db.employee.findUnique({ where: { id: requestedEmployeeId } })
  if (!target) return { ok: false as const, status: 404, error: 'Funcionário não encontrado' }
  if (!canActOnBehalfOf(actor, target)) return { ok: false as const, status: 403, error: 'Sem permissão' }
  return { id: target.id, ok: true as const }
}

// GET — buscar timesheet do mês/ano
export async function GET(req: NextRequest) {
  const actor = await getCurrentEmployee()
  if (!actor) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month      = parseInt(searchParams.get('month') ?? '')
  const year       = parseInt(searchParams.get('year')  ?? '')
  const employeeId = searchParams.get('employeeId') ?? undefined

  if (!month || !year) return NextResponse.json({ error: 'Mês e ano obrigatórios' }, { status: 400 })

  const target = await resolveTarget(actor, employeeId)
  if (!target.ok) return NextResponse.json({ error: target.error }, { status: target.status })

  const timesheet = await db.timesheet.findUnique({
    where:   { employeeId_month_year: { employeeId: target.id, month, year } },
    include: timesheetInclude,
  })

  return NextResponse.json(timesheet ?? null)
}

// POST — criar timesheet
export async function POST(req: NextRequest) {
  try {
    const actor = await getCurrentEmployee()
    if (!actor) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body   = await req.json()
    const parsed = timesheetSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const target = await resolveTarget(actor, parsed.data.employeeId)
    if (!target.ok) return NextResponse.json({ error: target.error }, { status: target.status })

    const existing = await db.timesheet.findUnique({
      where: { employeeId_month_year: { employeeId: target.id, month: parsed.data.month, year: parsed.data.year } }
    })
    if (existing) return NextResponse.json({ error: 'Já existe timesheet para este mês' }, { status: 409 })
    const lines = await compensationData(target.id, parsed.data)

    const timesheet = await db.timesheet.create({
      data: {
        employeeId:  target.id,
        createdById: target.id !== actor.id ? actor.id : undefined,
        month:       parsed.data.month,
        year:        parsed.data.year,
        lines:       { create: lines },
      },
      include: timesheetInclude,
    })

    return NextResponse.json(timesheet, { status: 201 })
  } catch (error) {
    return internalError(error)
  }
}

// PUT — guardar rascunho (actualizar linhas)
export async function PUT(req: NextRequest) {
  try {
    const actor = await getCurrentEmployee()
    if (!actor) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body   = await req.json()
    const parsed = timesheetSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const target = await resolveTarget(actor, parsed.data.employeeId)
    if (!target.ok) return NextResponse.json({ error: target.error }, { status: target.status })

    const existing = await db.timesheet.findUnique({
      where: { employeeId_month_year: { employeeId: target.id, month: parsed.data.month, year: parsed.data.year } }
    })
    if (!existing) return NextResponse.json({ error: 'Timesheet não encontrada' }, { status: 404 })
    if (existing.status === 'SUBMITTED') return NextResponse.json({ error: 'Não é possível editar uma timesheet submetida.' }, { status: 409 })
    if (existing.status === 'APPROVED')  return NextResponse.json({ error: 'Não é possível editar uma timesheet aprovada.' }, { status: 409 })

    const lines = await compensationData(target.id, parsed.data)
    const newStatus = existing.status === 'REJECTED' ? 'DRAFT' : existing.status

    const [, timesheet] = await db.$transaction([
      db.timesheetLine.deleteMany({ where: { timesheetId: existing.id } }),
      db.timesheet.update({
        where: { id: existing.id },
        data:  {
          status:     newStatus,
          reviewNote: existing.status === 'REJECTED' ? null : undefined,
          lines:      { create: lines },
        },
        include: timesheetInclude,
      }),
    ])

    return NextResponse.json(timesheet)
  } catch (error) {
    return internalError(error)
  }
}
