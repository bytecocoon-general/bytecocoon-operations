import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  skillId:  z.string().cuid(),
  minLevel: z.number().int().min(1).max(5).default(3),
  required: z.boolean().default(true),
})

async function requireAdmin(userId: string) {
  const employee = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!employee || (employee.role !== 'ADMIN' && employee.role !== 'MANAGER')) return null
  return employee
}

export async function GET(_req: NextRequest, { params }: { params: { projectId: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const skills = await db.projectSkill.findMany({
    where:   { projectId: params.projectId },
    include: { skill: true },
    orderBy: [{ required: 'desc' }, { skill: { name: 'asc' } }],
  })
  return NextResponse.json(skills)
}

export async function POST(req: NextRequest, { params }: { params: { projectId: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const skill = await db.projectSkill.upsert({
    where:  { projectId_skillId: { projectId: params.projectId, skillId: parsed.data.skillId } },
    update: { minLevel: parsed.data.minLevel, required: parsed.data.required },
    create: { projectId: params.projectId, ...parsed.data },
    include: { skill: true },
  })
  return NextResponse.json(skill, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { projectId: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { skillId } = await req.json()
  await db.projectSkill.delete({
    where: { projectId_skillId: { projectId: params.projectId, skillId } },
  })
  return NextResponse.json({ ok: true })
}
