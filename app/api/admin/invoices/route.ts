import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { invoiceSchema } from '@/lib/validators'
import { z } from 'zod'

async function requireAdmin(userId: string) {
  const employee = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!employee || (employee.role !== 'ADMIN' && employee.role !== 'MANAGER')) return null
  return employee
}

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await db.invoice.count({
    where: { invoiceNumber: { startsWith: `INV-${year}-` } },
  })
  return `INV-${year}-${String(count + 1).padStart(4, '0')}`
}

function calcTotals(lines: { quantity: number; unitPrice: number }[], taxRate: number) {
  const subtotal  = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total     = subtotal + taxAmount
  return { subtotal, taxAmount, total }
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const invoices = await db.invoice.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      client: { select: { id: true, name: true } },
      lines:  { include: { project: { select: { id: true, name: true } } } },
    },
  })
  return NextResponse.json(invoices)
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body   = await req.json()
  const parsed = invoiceSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { issueDate, dueDate, lines, taxRate, ...rest } = parsed.data
  const { subtotal, taxAmount, total } = calcTotals(lines, taxRate)
  const invoiceNumber = await generateInvoiceNumber()

  const invoice = await db.invoice.create({
    data: {
      ...rest,
      invoiceNumber,
      issueDate: new Date(issueDate),
      dueDate:   new Date(dueDate),
      taxRate,
      subtotal,
      taxAmount,
      total,
      lines: {
        create: lines.map(l => ({
          projectId:   l.projectId ?? null,
          description: l.description,
          quantity:    l.quantity,
          unitPrice:   l.unitPrice,
          amount:      l.quantity * l.unitPrice,
        })),
      },
    },
    include: {
      client: { select: { id: true, name: true } },
      lines:  { include: { project: { select: { id: true, name: true } } } },
    },
  })
  return NextResponse.json(invoice, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body   = await req.json()
  const parsed = invoiceSchema.extend({ id: z.string() }).safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { id, issueDate, dueDate, lines, taxRate, ...rest } = parsed.data
  const { subtotal, taxAmount, total } = calcTotals(lines, taxRate)

  const invoice = await db.$transaction(async (tx) => {
    await tx.invoiceLine.deleteMany({ where: { invoiceId: id } })
    return tx.invoice.update({
      where: { id },
      data: {
        ...rest,
        issueDate: new Date(issueDate),
        dueDate:   new Date(dueDate),
        taxRate,
        subtotal,
        taxAmount,
        total,
        lines: {
          create: lines.map(l => ({
            projectId:   l.projectId ?? null,
            description: l.description,
            quantity:    l.quantity,
            unitPrice:   l.unitPrice,
            amount:      l.quantity * l.unitPrice,
          })),
        },
      },
      include: {
        client: { select: { id: true, name: true } },
        lines:  { include: { project: { select: { id: true, name: true } } } },
      },
    })
  })
  return NextResponse.json(invoice)
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  await db.invoice.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
