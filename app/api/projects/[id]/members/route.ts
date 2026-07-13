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

// GET /api/projects/[id]/members — list all members of a project
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const members = await db.projectMember.findMany({
    where:   { projectId: params.id },
    include: memberInclude,
    orderBy: { employee: { name: 'asc' } },
  })
  return NextResponse.json(members)
}

// POST /api/projects/[id]/members — add a member to a project
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const project = await db.project.findUnique({ where: { id: params.id } })
  if (!project) return NextResponse.json({ error: 'Projecto não encontrado' }, { status: 404 })

  const body   = await req.json()
  const parsed = projectMemberSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await db.projectMember.findUnique({
    where: { projectId_employeeId: { projectId: params.id, employeeId: parsed.data.employeeId } },
  })
  if (existing) return NextResponse.json({ error: 'Colaborador já está neste projecto.' }, { status: 409 })

  const member = await db.projectMember.create({
    data: {
      projectId:  params.id,
      employeeId: parsed.data.employeeId,
      role:       parsed.data.role ?? null,
      startDate:  parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate:    parsed.data.endDate   ? new Date(parsed.data.endDate)   : null,
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

  return NextResponse.json(member, { status: 201 })
}
