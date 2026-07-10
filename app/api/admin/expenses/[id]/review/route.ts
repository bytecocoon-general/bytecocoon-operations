import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const reviewSchema = z.object({
  action: z.enum(['APPROVED', 'REJECTED']),
  note:   z.string().max(500).optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const reviewer = await db.employee.findUnique({ where: { clerkId: userId } })
    if (!reviewer || (reviewer.role !== 'ADMIN' && reviewer.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body   = await req.json()
    const parsed = reviewSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const existing = await db.expense.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Despesa não encontrada' }, { status: 404 })
    if (existing.status !== 'SUBMITTED') {
      return NextResponse.json({ error: 'Só é possível rever despesas submetidas.' }, { status: 409 })
    }

    if (parsed.data.action === 'REJECTED' && !parsed.data.note?.trim()) {
      return NextResponse.json({ error: 'É obrigatório indicar o motivo da rejeição.' }, { status: 400 })
    }

    const expense = await db.expense.update({
      where: { id: params.id },
      data: {
        status:     parsed.data.action,
        reviewedBy: reviewer.id,
        reviewNote: parsed.data.note ?? null,
        reviewedAt: new Date(),
      },
      include: {
        project:  { select: { id: true, name: true } },
        employee: { select: { id: true, name: true, department: { select: { name: true } } } },
      },
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
