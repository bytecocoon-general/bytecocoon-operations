import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentEmployee, canActOnBehalfOf } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const actor = await getCurrentEmployee()
  if (!actor) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { timesheetId } = await req.json()

  const timesheet = await db.timesheet.findUnique({ where: { id: timesheetId }, include: { employee: true } })
  if (!timesheet) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })
  if (!canActOnBehalfOf(actor, timesheet.employee)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  if (timesheet.status !== 'DRAFT') return NextResponse.json({ error: 'Só é possível submeter rascunhos' }, { status: 409 })

  const updated = await db.timesheet.update({
    where: { id: timesheetId },
    data:  {
      status:      'SUBMITTED',
      submittedAt: new Date(),
      auditLogs:   { create: { action: 'SUBMITTED', performedBy: actor.id } },
    },
  })

  return NextResponse.json(updated)
}
