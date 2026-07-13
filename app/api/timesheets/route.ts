import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { timesheetSchema } from '@/lib/validators'
import { getCurrentEmployee, canActOnBehalfOf } from '@/lib/auth'
import { z } from 'zod'

const timesheetInclude = {
  lines: { orderBy: { date: 'asc' as const }, include: { project: { select: { name: true } } } },
  travelPeriods: { orderBy: { startDate: 'asc' as const }, include: { project: { select: { name: true } } } },
  mileageEntries: { orderBy: { date: 'asc' as const }, include: { project: { select: { name: true } } } },
}

async function compensationData(employeeId: string, data: z.infer<typeof timesheetSchema>) {
  const employee = await db.employee.findUnique({ where: { id: employeeId }, include: { projectMemberships: true } })
  if (!employee) throw new Error('EMPLOYEE_NOT_FOUND')
  const monthStart = new Date(Date.UTC(data.year, data.month - 1, 1))
  const monthEnd = new Date(Date.UTC(data.year, data.month, 0))
  const parseDate = (value: string) => new Date(value.substring(0, 10) + 'T00:00:00.000Z')

  const coveredTravelDays = new Set<string>()
  const travelPeriods = data.travelPeriods.map(period => {
    const startDate = parseDate(period.startDate); const endDate = parseDate(period.endDate)
    if (startDate > endDate || startDate < monthStart || endDate > monthEnd) throw new Error('INVALID_TRAVEL_DATES')
    const days = Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1
    for (let cursor = startDate.getTime(); cursor <= endDate.getTime(); cursor += 86400000) {
      const key = new Date(cursor).toISOString().substring(0, 10)
      if (coveredTravelDays.has(key)) throw new Error('OVERLAPPING_TRAVEL_PERIODS')
      coveredTravelDays.add(key)
    }
    const membership = period.projectId ? employee.projectMemberships.find(item => item.projectId === period.projectId) : null
    const dailyRate = membership?.perDiemRate != null ? Number(membership.perDiemRate) : Number(employee.perDiemRate)
    return { ...period, startDate, endDate, days, dailyRate, amount: days * dailyRate }
  })

  const compensatedDays = new Set<string>()
  const mileageEntries = data.mileageEntries.map(entry => {
    const date = parseDate(entry.date)
    if (date < monthStart || date > monthEnd) throw new Error('INVALID_MILEAGE_DATE')
    const rateMode = employee.mileageMode
    const rate = Number(employee.mileageRate)
    const key = entry.date.substring(0, 10)
    const amount = rateMode === 'PER_KM' ? entry.kilometres * rate
      : rateMode === 'PER_DAY' && !compensatedDays.has(key) ? rate : 0
    compensatedDays.add(key)
    return { ...entry, date, rateMode, rate, amount }
  })
  return { travelPeriods, mileageEntries }
}

function internalError(error: unknown) {
  const messages: Record<string, string> = {
    INVALID_TRAVEL_DATES: 'As deslocações têm de estar dentro do mês e a data final não pode ser anterior à inicial.',
    OVERLAPPING_TRAVEL_PERIODS: 'Existem períodos de deslocação sobrepostos.',
    INVALID_MILEAGE_DATE: 'A data da quilometragem tem de pertencer ao mês da timesheet.',
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
    const compensation = await compensationData(target.id, parsed.data)

    const timesheet = await db.timesheet.create({
      data: {
        employeeId:  target.id,
        createdById: target.id !== actor.id ? actor.id : undefined,
        month:       parsed.data.month,
        year:        parsed.data.year,
        lines:       { create: parsed.data.lines },
        travelPeriods: { create: compensation.travelPeriods },
        mileageEntries: { create: compensation.mileageEntries },
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

    const compensation = await compensationData(target.id, parsed.data)
    const newStatus = existing.status === 'REJECTED' ? 'DRAFT' : existing.status

    const [, , , timesheet] = await db.$transaction([
      db.timesheetLine.deleteMany({ where: { timesheetId: existing.id } }),
      db.travelPeriod.deleteMany({ where: { timesheetId: existing.id } }),
      db.mileageEntry.deleteMany({ where: { timesheetId: existing.id } }),
      db.timesheet.update({
        where: { id: existing.id },
        data:  {
          status:     newStatus,
          reviewNote: existing.status === 'REJECTED' ? null : undefined,
          lines:      { create: parsed.data.lines },
          travelPeriods: { create: compensation.travelPeriods },
          mileageEntries: { create: compensation.mileageEntries },
        },
        include: timesheetInclude,
      }),
    ])

    return NextResponse.json(timesheet)
  } catch (error) {
    return internalError(error)
  }
}
