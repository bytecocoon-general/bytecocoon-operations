import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const timesheet = await db.timesheet.findUnique({
    where:   { id: params.id },
    include: { lines: { orderBy: { date: 'asc' } } },
  })

  if (!timesheet) return NextResponse.json({ error: 'Não encontrada' }, { status: 404 })

  return NextResponse.json(timesheet)
}