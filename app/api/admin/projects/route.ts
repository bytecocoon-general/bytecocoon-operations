import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projectSchema } from '@/lib/validators'
import { z } from 'zod'

async function requireAdmin(userId: string) {
  const employee = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!employee || (employee.role !== 'ADMIN' && employee.role !== 'MANAGER')) return null
  return employee
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const projects = await db.project.findMany({
    orderBy: { name: 'asc' },
    include: {
      client: { select: { id: true, name: true } },
      _count:  { select: { timesheetLines: true } },
    },
  })
  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body   = await req.json()
  const parsed = projectSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { clientId, startDate, endDate, ...rest } = parsed.data
  const project = await db.project.create({
    data: {
      ...rest,
      ...(clientId  ? { client: { connect: { id: clientId } } } : {}),
      ...(startDate ? { startDate: new Date(startDate) }        : {}),
      ...(endDate   ? { endDate:   new Date(endDate)   }        : {}),
    },
    include: { client: { select: { id: true, name: true } } },
  })
  return NextResponse.json(project, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body   = await req.json()
  const parsed = projectSchema.extend({ id: z.string() }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { id, clientId, startDate, endDate, ...rest } = parsed.data
  const project = await db.project.update({
    where: { id },
    data: {
      ...rest,
      client:    clientId  ? { connect: { id: clientId } } : { disconnect: true },
      startDate: startDate ? new Date(startDate)           : null,
      endDate:   endDate   ? new Date(endDate)             : null,
    },
    include: { client: { select: { id: true, name: true } } },
  })
  return NextResponse.json(project)
}
