import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const manager = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!manager) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
  if (manager.role !== 'MANAGER' && manager.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') // SUBMITTED, APPROVED, REJECTED, ou null (todos)

  const timesheets = await db.timesheet.findMany({
    where: status ? { status: status as 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'DRAFT' } : {},
    include: {
      employee: {
        include: {
          department: true,
          projectMemberships: { select: { projectId: true, overtimeAllowed: true } },
        },
      },
      lines: { orderBy: { date: 'asc' }, include: { project: { select: { name: true } } } },
      travelPeriods: { orderBy: { startDate: 'asc' }, include: { project: { select: { name: true } } } },
      mileageEntries: { orderBy: { date: 'asc' }, include: { project: { select: { name: true } } } },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }, { submittedAt: 'desc' }],
  })

  return NextResponse.json(timesheets)
}
