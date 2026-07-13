import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projectMemberSchema } from '@/lib/validators'

async function requireAdmin(userId: string) {
  const employee = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!employee || (employee.role !== 'ADMIN' && employee.role !== 'MANAGER')) return null
  return employee
}

const memberInclude = {
  employee: {
    select: { id: true, name: true, email: true, hourlyRate: true, department: { select: { name: true } } },
  },
}

// PUT /api/projects/[id]/members/[memberId] — update member config
export async function PUT(req: NextRequest, { params }: { params: { id: string; memberId: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const existing = await db.projectMember.findFirst({
    where: { id: params.memberId, projectId: params.id },
  })
  if (!existing) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 })

  const body   = await req.json()
  const parsed = projectMemberSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const member = await db.projectMember.update({
    where: { id: params.memberId },
    data: {
      role:                       parsed.data.role ?? null,
      startDate:                  parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate:                    parsed.data.endDate   ? new Date(parsed.data.endDate)   : null,
      clientRate:                 parsed.data.clientRate,
      perDiemRate:                parsed.data.perDiemRate ?? null,
      overtimeAllowed:            parsed.data.overtimeAllowed,
      overtimeWeekdayMultiplier:  parsed.data.overtimeWeekdayMultiplier,
      overtimeWeekendMultiplier:  parsed.data.overtimeWeekendMultiplier,
      onCallAllowed:              parsed.data.onCallAllowed,
      onCallWeeklyRate:           parsed.data.onCallWeeklyRate,
      expensesAllowed:            parsed.data.expensesAllowed,
      expensesMonthlyLimit:       parsed.data.expensesMonthlyLimit ?? null,
    },
    include: memberInclude,
  })

  return NextResponse.json(member)
}

// DELETE /api/projects/[id]/members/[memberId] — remove member from project
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; memberId: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const existing = await db.projectMember.findFirst({
    where: { id: params.memberId, projectId: params.id },
  })
  if (!existing) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 })

  await db.projectMember.delete({ where: { id: params.memberId } })
  return NextResponse.json({ ok: true })
}
