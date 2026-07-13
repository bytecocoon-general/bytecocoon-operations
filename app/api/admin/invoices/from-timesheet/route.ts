/**
 * POST /api/admin/invoices/from-timesheet
 *
 * Generates one invoice per (employee, client) pair from APPROVED timesheets in a
 * given month/year — e.g. if Manuel worked for Client A and Client B, and Vítor
 * also worked for both, this creates 4 separate invoices, not one per client.
 *
 * Each TimesheetLine gets an invoicedAt timestamp once it's included in a generated
 * invoice, so re-running this for the same period never bills the same hours twice.
 * Lines whose employee has no ProjectMember.clientRate configured for that project
 * are skipped (with a warning) and left unmarked, so they can still be billed once
 * the rate is configured.
 *
 * Once a timesheet has no more billable lines left unbilled (no warnings were raised
 * for it), its Timesheet.fullyInvoicedAt gets set too, so future runs can skip it
 * (and its lines) entirely at the query level instead of re-fetching and re-checking.
 */
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

async function requireAdmin(userId: string) {
  const employee = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!employee || (employee.role !== 'ADMIN' && employee.role !== 'MANAGER')) return null
  return employee
}

async function generateInvoiceNumber(tx: Prisma.TransactionClient, year: number): Promise<string> {
  const count = await tx.invoice.count({
    where: { invoiceNumber: { startsWith: `INV-${year}-` } },
  })
  return `INV-${year}-${String(count + 1).padStart(4, '0')}`
}

const schema = z.object({
  month:     z.number().int().min(1).max(12),
  year:      z.number().int().min(2020).max(2100),
  taxRate:   z.number().min(0).max(100).default(23),
  dueInDays: z.number().int().min(0).max(365).default(30),
})

interface PendingLine { projectId: string; description: string; quantity: number; unitPrice: number; lineIds: string[] }
interface PendingInvoice { clientId: string; employeeName: string; lines: PendingLine[] }

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!await requireAdmin(userId)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const body   = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { month, year, taxRate, dueInDays } = parsed.data

  const timesheets = await db.timesheet.findMany({
    where: {
      status:          'APPROVED',
      month,
      year,
      fullyInvoicedAt: null,
      employee:        { isActive: true },
    },
    include: {
      employee: { include: { projectMemberships: { select: { projectId: true, clientRate: true } } } },
      lines: {
        where:   { type: 'WORK', invoicedAt: null },
        include: { project: { select: { id: true, name: true, clientId: true } } },
      },
    },
  })

  const warnings: string[] = []
  const monthName = new Date(year, month - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })

  // employeeId+clientId -> factura pendente
  const pending = new Map<string, PendingInvoice>()
  // Timesheets sem nenhum aviso — já não fica nada por facturar, podem ser marcadas fullyInvoicedAt
  const fullyInvoicedTimesheetIds: string[] = []

  for (const ts of timesheets) {
    let tsHadWarning = false
    const clientRateByProject: Record<string, number> = {}
    for (const pm of ts.employee.projectMemberships) clientRateByProject[pm.projectId] = Number(pm.clientRate)

    // Agregar horas por projecto (mantendo os ids das linhas de origem)
    const byProject: Record<string, { clientId: string; project: { id: string; name: string }; hours: number; rate: number | null; lineIds: string[] }> = {}

    for (const line of ts.lines) {
      const clientId = line.project?.clientId
      if (!clientId || !line.projectId) continue // projecto interno / sem cliente — não facturável

      if (!byProject[line.projectId]) {
        byProject[line.projectId] = {
          clientId,
          project: { id: line.project!.id, name: line.project!.name },
          hours:   0,
          rate:    clientRateByProject[line.projectId] ?? null,
          lineIds: [],
        }
      }
      byProject[line.projectId].hours += Number(line.hours) + Number(line.extraHours)
      byProject[line.projectId].lineIds.push(line.id)
    }

    for (const item of Object.values(byProject)) {
      if (item.hours === 0) continue
      if (item.rate == null) {
        warnings.push(`${ts.employee.name} — ${item.project.name}: sem tarifa de cliente configurada (aloca ao projecto em Staffing); ${item.hours}h não facturadas.`)
        tsHadWarning = true
        continue
      }

      const key = `${ts.employeeId}:${item.clientId}`
      if (!pending.has(key)) pending.set(key, { clientId: item.clientId, employeeName: ts.employee.name, lines: [] })
      pending.get(key)!.lines.push({
        projectId:   item.project.id,
        description: `${ts.employee.name} — ${item.project.name} (${monthName})`,
        quantity:    item.hours,
        unitPrice:   item.rate,
        lineIds:     item.lineIds,
      })
    }

    if (!tsHadWarning) fullyInvoicedTimesheetIds.push(ts.id)
  }

  if (pending.size === 0) {
    return NextResponse.json({
      error: warnings.length > 0
        ? `Nenhuma hora facturável: ${warnings.join(' ')}`
        : 'Nenhuma hora aprovada encontrada para este período.',
    }, { status: 400 })
  }

  const issueDate = new Date()
  const dueDate   = new Date()
  dueDate.setDate(dueDate.getDate() + dueInDays)

  const invoices = await db.$transaction(async (tx) => {
    const created: unknown[] = []
    const invoicedLineIds: string[] = []

    for (const { clientId, lines } of Array.from(pending.values())) {
      const subtotal  = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
      const taxAmount = subtotal * (taxRate / 100)
      const total     = subtotal + taxAmount
      const invoiceNumber = await generateInvoiceNumber(tx, new Date().getFullYear())

      const invoice = await tx.invoice.create({
        data: {
          clientId,
          invoiceNumber,
          issueDate,
          dueDate,
          taxRate,
          subtotal,
          taxAmount,
          total,
          lines: {
            create: lines.map(l => ({
              projectId:   l.projectId,
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

      created.push(invoice)
      for (const l of lines) invoicedLineIds.push(...l.lineIds)
    }

    if (invoicedLineIds.length > 0) {
      await tx.timesheetLine.updateMany({ where: { id: { in: invoicedLineIds } }, data: { invoicedAt: new Date() } })
    }
    if (fullyInvoicedTimesheetIds.length > 0) {
      await tx.timesheet.updateMany({ where: { id: { in: fullyInvoicedTimesheetIds } }, data: { fullyInvoicedAt: new Date() } })
    }

    return created
  }, { timeout: 30000 })

  return NextResponse.json({ invoices, warnings, count: invoices.length }, { status: 201 })
}
