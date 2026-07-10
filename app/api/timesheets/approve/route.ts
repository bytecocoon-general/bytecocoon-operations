import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const manager = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!manager) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  if (manager.role !== 'MANAGER' && manager.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { timesheetId, action, note } = await req.json()
  if (!['APPROVED', 'REJECTED'].includes(action)) {
    return NextResponse.json({ error: 'Acção inválida' }, { status: 400 })
  }
  if (action === 'REJECTED' && !note?.trim()) {
    return NextResponse.json({ error: 'Nota obrigatória para rejeição' }, { status: 400 })
  }

  const timesheet = await db.timesheet.findUnique({ where: { id: timesheetId } })
  if (!timesheet) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })
  if (timesheet.status !== 'SUBMITTED') {
    return NextResponse.json({ error: 'Só é possível aprovar/rejeitar timesheets submetidas' }, { status: 409 })
  }

  const updated = await db.timesheet.update({
    where: { id: timesheetId },
    data: {
      status:     action,
      reviewedAt: new Date(),
      reviewedBy: manager.id,
      reviewNote: note ?? null,
      auditLogs:  { create: { action, performedBy: manager.id, note: note ?? null } },
    },
    include: { employee: true },
  })

  return NextResponse.json(updated)
}