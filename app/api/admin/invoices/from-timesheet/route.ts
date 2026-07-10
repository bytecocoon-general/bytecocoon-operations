import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

async function requireAdmin(userId: string) {
  const employee = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!employee || (employee.role !== 'ADMIN' && employee.role !== 'MANAGER')) return null
  return employee
}

async function generateInvoiceNumber(): Promise<string> {
  const year  = new Date().getFullYear()
  const count = await db.invoice.count({
    where: { invoiceNumber: { startsWith: `INV-${year}-` } },
  })
  return `INV-${year}-${String(count + 1).padStart(4, '0')}`
}

const schema = z.object({
  clientId:  z.string().cuid(),
  month:     z.number().int().min(1).max(12),
  year:      z.number().int().min(2020).max(2100),
  taxRate:   z.number().min(0).max(100).default(23),
  dueInDays: z.number().int().min(0).max(365).default(30),
})

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { clientId, month, year, taxRate, dueInDays } = parsed.data

  // Buscar timesheets aprovadas do cliente nesse mês/ano
  const timesheets = await db.timesheet.findMany({
    where: {
      status:   'APPROVED',
      month,
      year,
      employee: {
        isActive: true,
      },
    },
    include: {
      employee: true,
      lines: {
        include: { project: true },
        where: {
          type:    'WORK',
          project: { clientId },
        },
      },
    },
  })

  const invoiceLines: { projectId: string | null; description: string; quantity: number; unitPrice: number }[] = []

  for (const ts of timesheets) {
    // Agregar horas por projecto
    const byProject: Record<string, { project: { id: string; name: string }; hours: number; rate: number }> = {}

    for (const line of ts.lines) {
      const key = line.projectId ?? '__no_project'
      if (!byProject[key]) {
        byProject[key] = {
          project: { id: line.project?.id ?? '', name: line.project?.name ?? 'Sem projecto' },
          hours:   0,
          rate:    Number(ts.employee.hourlyRate),
        }
      }
      byProject[key].hours += Number(line.hours) + Number(line.extraHours)
    }

    for (const item of Object.values(byProject)) {
      if (item.hours === 0) continue
      const monthName = new Date(year, month - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
      invoiceLines.push({
        projectId:   item.project.id || null,
        description: `${ts.employee.name} — ${item.project.name} (${monthName})`,
        quantity:    item.hours,
        unitPrice:   item.rate,
      })
    }
  }

  if (invoiceLines.length === 0) {
    return NextResponse.json({ error: 'Nenhuma hora aprovada encontrada para este cliente neste período.' }, { status: 400 })
  }

  const subtotal  = invoiceLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const total     = subtotal + taxAmount

  const issueDate = new Date()
  const dueDate   = new Date()
  dueDate.setDate(dueDate.getDate() + dueInDays)

  const invoiceNumber = await generateInvoiceNumber()

  const invoice = await db.invoice.create({
    data: {
      clientId,
      invoiceNumber,
      issueDate,
      dueDate,
      taxRate,
      subtotal,
      taxAmount,
      total,
      lines: { create: invoiceLines.map(l => ({ ...l, amount: l.quantity * l.unitPrice })) },
    },
    include: {
      client: { select: { id: true, name: true } },
      lines:  { include: { project: { select: { id: true, name: true } } } },
    },
  })

  return NextResponse.json(invoice, { status: 201 })
}
