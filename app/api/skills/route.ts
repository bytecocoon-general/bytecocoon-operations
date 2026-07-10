import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const skillSchema = z.object({
  name:     z.string().min(1).max(100),
  category: z.string().min(1).max(100).default('Técnico'),
})

async function requireAdmin(userId: string) {
  const employee = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!employee || (employee.role !== 'ADMIN' && employee.role !== 'MANAGER')) return null
  return employee
}

// GET — list all skills with usage counts
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const skills = await db.skill.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { employees: true, projects: true } },
    },
  })
  return NextResponse.json(skills)
}

// POST — create skill
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body   = await req.json()
  const parsed = skillSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const existing = await db.skill.findUnique({ where: { name: parsed.data.name } })
  if (existing) return NextResponse.json({ error: 'Skill já existe.' }, { status: 409 })

  const skill = await db.skill.create({ data: parsed.data })
  return NextResponse.json(skill, { status: 201 })
}
