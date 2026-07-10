import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

async function requireAdmin(userId: string) {
  const employee = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!employee || (employee.role !== 'ADMIN' && employee.role !== 'MANAGER')) return null
  return employee
}

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const month  = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined
  const year   = searchParams.get('year')  ? parseInt(searchParams.get('year')!)  : undefined

  const expenses = await db.expense.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(month || year ? {
        date: {
          gte: month && year ? new Date(year, month - 1, 1) : undefined,
          lte: month && year ? new Date(year, month, 0)     : undefined,
        },
      } : {}),
    },
    include: {
      employee: { include: { department: { select: { name: true } } } },
      project:  { select: { id: true, name: true } },
    },
    orderBy: [{ submittedAt: 'desc' }, { date: 'desc' }],
  })

  return NextResponse.json(expenses)
}
