/**
 * POST /api/timesheets/import
 *
 * Receives pre-parsed timesheet lines (from the client-side Excel parser)
 * and inserts them into the employee's timesheet for the given month/year.
 *
 * The endpoint is additive — it never replaces existing lines.
 * It skips lines whose exact (date + type + hours + projectId) already exists.
 *
 * Body:
 *   {
 *     month:     number          // 1–12
 *     year:      number
 *     projectId: string | null   // target project chosen by the user
 *     lines: Array<{
 *       date:       string       // ISO YYYY-MM-DD
 *       hours:      number
 *       extraHours: number
 *       rawRate?:   number       // 1 | 1.5 | 2 — saved as overtimeMultiplier when extraHours > 0
 *       type:       string       // WORK | VACATION | SICK_LEAVE | TRAINING | …
 *       description?: string
 *     }>
 *   }
 *
 * Response:
 *   { timesheetId, inserted, skipped, total }
 */

import { NextRequest, NextResponse } from 'next/server'
import { db }          from '@/lib/db'
import { z }           from 'zod'
import { getCurrentEmployee, canActOnBehalfOf } from '@/lib/auth'

const lineSchema = z.object({
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hours:       z.number().min(0).max(24),
  extraHours:  z.number().min(0).max(24),
  rawRate:     z.number().optional(),
  type:        z.string().min(1),
  description: z.string().optional(),
})

const bodySchema = z.object({
  month:      z.number().int().min(1).max(12),
  year:       z.number().int().min(2000).max(2100),
  projectId:  z.string().nullable(),
  lines:      z.array(lineSchema).min(1).max(500),
  // Existing employees may use IDs imported from legacy systems.
  employeeId: z.string().min(1).optional(),
})

export async function POST(req: NextRequest) {
  const actor = await getCurrentEmployee()
  if (!actor) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body   = await req.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { month, year, projectId, lines, employeeId: requestedEmployeeId } = parsed.data

  let employee = actor
  if (requestedEmployeeId && requestedEmployeeId !== actor.id) {
    const target = await db.employee.findUnique({ where: { id: requestedEmployeeId } })
    if (!target) return NextResponse.json({ error: 'Colaborador não encontrado' }, { status: 404 })
    if (!canActOnBehalfOf(actor, target)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    employee = target
  }

  // Validate projectId exists and is active (if provided)
  if (projectId) {
    const project = await db.project.findUnique({ where: { id: projectId } })
    if (!project) {
      return NextResponse.json({ error: 'Projecto não encontrado' }, { status: 404 })
    }
  }

  // Get or create the timesheet
  let timesheet = await db.timesheet.findUnique({
    where: { employeeId_month_year: { employeeId: employee.id, month, year } },
    include: { lines: { select: { date: true, type: true, hours: true, extraHours: true, projectId: true } } },
  })

  if (!timesheet) {
    timesheet = await db.timesheet.create({
      data: {
        employeeId:  employee.id,
        createdById: employee.id !== actor.id ? actor.id : undefined,
        month, year, status: 'DRAFT',
      },
      include: { lines: { select: { date: true, type: true, hours: true, extraHours: true, projectId: true } } },
    })
  }

  // Reject if timesheet is already submitted/approved
  if (timesheet.status === 'SUBMITTED' || timesheet.status === 'APPROVED') {
    return NextResponse.json(
      { error: `Não é possível importar: a timesheet de ${month}/${year} está ${timesheet.status === 'SUBMITTED' ? 'submetida' : 'aprovada'}.` },
      { status: 409 }
    )
  }

  // Build a set of existing lines for duplicate detection
  // Key: "YYYY-MM-DD|type|hours|extraHours|projectId"
  const existingKeys = new Set(
    timesheet.lines.map(l => {
      const d = l.date instanceof Date ? l.date.toISOString().substring(0, 10) : String(l.date).substring(0, 10)
      return `${d}|${l.type}|${Number(l.hours)}|${Number(l.extraHours)}|${l.projectId ?? ''}`
    })
  )

  // Prepare new lines, skipping exact duplicates
  let inserted = 0
  let skipped  = 0

  for (const line of lines) {
    // For non-WORK types ignore projectId (absences have no project)
    const effectiveProjectId = (line.type === 'WORK') ? projectId : null

    const key = `${line.date}|${line.type}|${line.hours}|${line.extraHours}|${effectiveProjectId ?? ''}`
    if (existingKeys.has(key)) { skipped++; continue }

    await db.timesheetLine.create({
      data: {
        timesheetId:        timesheet.id,
        date:               new Date(line.date + 'T00:00:00.000Z'),
        projectId:          effectiveProjectId,
        type:               line.type,
        hours:              line.hours,
        extraHours:         line.extraHours,
        overtimeMultiplier: line.extraHours > 0 && line.rawRate && line.rawRate > 1 ? line.rawRate : null,
        description:        line.description ?? null,
      },
    })

    existingKeys.add(key)  // Prevent duplicates within the same import batch
    inserted++
  }

  return NextResponse.json({
    timesheetId: timesheet.id,
    inserted,
    skipped,
    total: lines.length,
  })
}
