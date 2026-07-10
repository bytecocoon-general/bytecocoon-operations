import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { expenseSchema } from '@/lib/validators'

const expenseInclude = {
  project:  { select: { id: true, name: true } },
  employee: { select: { id: true, name: true } },
}

async function getOwnExpense(id: string, employeeId: string) {
  return db.expense.findFirst({ where: { id, employeeId } })
}

// PUT — editar despesa DRAFT
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const employee = await db.employee.findUnique({ where: { clerkId: userId } })
    if (!employee) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    const existing = await getOwnExpense(params.id, employee.id)
    if (!existing) return NextResponse.json({ error: 'Despesa não encontrada' }, { status: 404 })
    if (existing.status !== 'DRAFT' && existing.status !== 'REJECTED') {
      return NextResponse.json({ error: 'Só é possível editar despesas em rascunho ou rejeitadas.' }, { status: 409 })
    }

    const body   = await req.json()
    const parsed = expenseSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const expense = await db.expense.update({
      where: { id: params.id },
      data: {
        projectId:   parsed.data.projectId ?? null,
        date:        new Date(parsed.data.date + 'T00:00:00.000Z'),
        category:    parsed.data.category,
        amount:      parsed.data.amount,
        description: parsed.data.description ?? null,
        // If re-editing a rejected expense, reset to DRAFT
        status:      existing.status === 'REJECTED' ? 'DRAFT' : 'DRAFT',
        reviewNote:  existing.status === 'REJECTED' ? null : undefined,
        reviewedBy:  existing.status === 'REJECTED' ? null : undefined,
        reviewedAt:  existing.status === 'REJECTED' ? null : undefined,
      },
      include: expenseInclude,
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE — apagar despesa DRAFT
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const employee = await db.employee.findUnique({ where: { clerkId: userId } })
    if (!employee) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    const existing = await getOwnExpense(params.id, employee.id)
    if (!existing) return NextResponse.json({ error: 'Despesa não encontrada' }, { status: 404 })
    if (existing.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Só é possível apagar despesas em rascunho.' }, { status: 409 })
    }

    await db.expense.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST /api/expenses/[id]/submit — submeter para aprovação
// (handled in /api/expenses/[id]/submit/route.ts)
