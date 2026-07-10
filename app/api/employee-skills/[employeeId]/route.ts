import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  skillId: z.string().cuid(),
  level:   z.number().int().min(1).max(5).default(3),
})

async function requireAdminOrSelf(userId: string, employeeId: string) {
  const employee = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!employee) return null
  if (employee.role === 'ADMIN' || employee.role === 'MANAGER') return employee
  if (employee.id === employeeId) return employee
  return null
}

// GET — list skills of an employee
export async function GET(_req: NextRequest, { params }: { params: { employeeId: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const skills = await db.employeeSkill.findMany({
    where:   { employeeId: params.employeeId },
    include: { skill: true },
    orderBy: [{ skill: { category: 'asc' } }, { skill: { name: 'asc' } }],
  })
  return NextResponse.json(skills)
}

// POST — add/update a skill
export async function POST(req: NextRequest, { params }: { params: { employeeId: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdminOrSelf(userId, params.employeeId)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const skill = await db.employeeSkill.upsert({
    where:  { employeeId_skillId: { employeeId: params.employeeId, skillId: parsed.data.skillId } },
    update: { level: parsed.data.level },
    create: { employeeId: params.employeeId, skillId: parsed.data.skillId, level: parsed.data.level },
    include: { skill: true },
  })
  return NextResponse.json(skill, { status: 201 })
}

// DELETE — remove a skill from an employee
export async function DELETE(req: NextRequest, { params }: { params: { employeeId: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdminOrSelf(userId, params.employeeId)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { skillId } = await req.json()
  await db.employeeSkill.delete({
    where: { employeeId_skillId: { employeeId: params.employeeId, skillId } },
  })
  return NextResponse.json({ ok: true })
}
