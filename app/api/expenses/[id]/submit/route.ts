import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const employee = await db.employee.findUnique({ where: { clerkId: userId } })
    if (!employee) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    const existing = await db.expense.findFirst({ where: { id: params.id, employeeId: employee.id } })
    if (!existing) return NextResponse.json({ error: 'Despesa não encontrada' }, { status: 404 })
    if (existing.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Só é possível submeter despesas em rascunho.' }, { status: 409 })
    }

    const expense = await db.expense.update({
      where: { id: params.id },
      data:  { status: 'SUBMITTED', submittedAt: new Date() },
      include: {
        project:  { select: { id: true, name: true } },
        employee: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(expense)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
