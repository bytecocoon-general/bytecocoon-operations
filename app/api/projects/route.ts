import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const includeMembers = searchParams.get('includeMembers') === 'true'
  const includeInactive = searchParams.get('includeInactive') === 'true'

  const projects = await db.project.findMany({
    where:   includeInactive ? {} : { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id:       true,
      name:     true,
      isActive: true,
      client:   { select: { name: true } },
      ...(includeMembers ? {
        members: {
          orderBy: { employee: { name: 'asc' as const } },
          include: {
            employee: {
              select: {
                id: true, name: true, email: true, hourlyRate: true,
                department: { select: { name: true } },
              },
            },
          },
        },
      } : {}),
    },
  })

  return NextResponse.json(projects)
}