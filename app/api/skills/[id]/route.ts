import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const skillSchema = z.object({
  name:     z.string().min(1).max(100),
  category: z.string().min(1).max(100),
})

async function requireAdmin(userId: string) {
  const employee = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!employee || (employee.role !== 'ADMIN' && employee.role !== 'MANAGER')) return null
  return employee
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body   = await req.json()
  const parsed = skillSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const skill = await db.skill.update({ where: { id: params.id }, data: parsed.data })
  return NextResponse.json(skill)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  await db.skill.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
