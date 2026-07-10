import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { timesheetId } = await req.json()

  const employee = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!employee) return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })

  const timesheet = await db.timesheet.findUnique({ where: { id: timesheetId } })
  if (!timesheet) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })
  if (timesheet.employeeId !== employee.id) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  if (timesheet.status !== 'DRAFT') return NextResponse.json({ error: 'Só é possível submeter rascunhos' }, { status: 409 })

  const updated = await db.timesheet.update({
    where: { id: timesheetId },
    data:  {
      status:      'SUBMITTED',
      submittedAt: new Date(),
      auditLogs:   { create: { action: 'SUBMITTED', performedBy: employee.id } },
    },
  })

  return NextResponse.json(updated)
}