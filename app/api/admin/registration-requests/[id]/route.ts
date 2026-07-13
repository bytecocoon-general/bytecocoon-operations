import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'

const schema = z.object({ action: z.enum(['APPROVE', 'REJECT']) })

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Acção inválida' }, { status: 400 })

  const employee = await db.employee.findUnique({ where: { id: params.id } })
  if (!employee) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  if (employee.accessStatus !== 'PENDING') return NextResponse.json({ error: 'Este pedido já foi decidido.' }, { status: 409 })

  const updated = await db.employee.update({
    where: { id: employee.id },
    data: {
      accessStatus: parsed.data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      accessReviewedAt: new Date(),
      accessReviewedBy: admin.id,
      isActive: parsed.data.action === 'APPROVE',
    },
  })
  return NextResponse.json(updated)
}
