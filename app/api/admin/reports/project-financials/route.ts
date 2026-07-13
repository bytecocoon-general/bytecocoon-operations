/**
 * GET /api/admin/reports/project-financials
 *
 * Per-project financial summary for ADMIN/MANAGER:
 *   - invoiced:   sum of InvoiceLine.amount for invoices already PAID — money that has
 *                 actually come in. SENT/OVERDUE/DRAFT/CANCELLED don't count yet.
 *   - expenses:   sum of APPROVED Expense.amount tied to the project
 *   - laborCost:  cost of APPROVED timesheet WORK lines, at the employee's hourlyRate
 *                 (mirrors the payroll gross-pay formula in app/api/admin/payroll/route.ts,
 *                 but aggregated per project instead of per employee)
 *   - budget / remainingToInvoice = budget - invoiced (null when no budget is set)
 *
 * Bonuses and forward-looking planned costs (e.g. a future trip's per-diem) are not
 * modelled yet, so "remaining to spend" is intentionally not included here.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentEmployee } from '@/lib/auth'

const BILLED_STATUSES = ['PAID'] as const

export async function GET() {
  const actor = await getCurrentEmployee()
  if (!actor) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (actor.role !== 'ADMIN' && actor.role !== 'MANAGER') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const [projects, invoiceLines, expenseSums, workLines] = await Promise.all([
    db.project.findMany({
      select: { id: true, name: true, budget: true, client: { select: { name: true } }, clientName: true },
      orderBy: { name: 'asc' },
    }),
    db.invoiceLine.findMany({
      where: { projectId: { not: null }, invoice: { status: { in: [...BILLED_STATUSES] } } },
      select: { projectId: true, amount: true },
    }),
    db.expense.groupBy({
      by: ['projectId'],
      where: { status: 'APPROVED', projectId: { not: null } },
      _sum: { amount: true },
    }),
    db.timesheetLine.findMany({
      where: { type: 'WORK', projectId: { not: null }, timesheet: { status: 'APPROVED' } },
      select: {
        projectId:          true,
        hours:              true,
        extraHours:         true,
        overtimeMultiplier: true,
        timesheet:          { select: { employee: { select: { hourlyRate: true } } } },
      },
    }),
  ])

  const invoicedByProject: Record<string, number> = {}
  for (const line of invoiceLines) {
    invoicedByProject[line.projectId!] = (invoicedByProject[line.projectId!] ?? 0) + Number(line.amount)
  }

  const expensesByProject: Record<string, number> = {}
  for (const e of expenseSums) {
    expensesByProject[e.projectId!] = Number(e._sum.amount ?? 0)
  }

  const laborCostByProject: Record<string, number> = {}
  for (const line of workLines) {
    const rate = Number(line.timesheet.employee.hourlyRate)
    const mult = line.overtimeMultiplier != null ? Number(line.overtimeMultiplier) : 1.5
    const cost = Number(line.hours) * rate + Number(line.extraHours) * rate * mult
    laborCostByProject[line.projectId!] = (laborCostByProject[line.projectId!] ?? 0) + cost
  }

  const result = projects.map(p => {
    const invoiced   = invoicedByProject[p.id] ?? 0
    const expenses   = expensesByProject[p.id] ?? 0
    const laborCost  = laborCostByProject[p.id] ?? 0
    const spent      = expenses + laborCost
    const budget     = p.budget != null ? Number(p.budget) : null

    return {
      id:                 p.id,
      name:               p.name,
      clientName:         p.client?.name ?? p.clientName ?? null,
      invoiced,
      expenses,
      laborCost,
      spent,
      margin:             invoiced - spent,
      budget,
      remainingToInvoice: budget != null ? budget - invoiced : null,
    }
  })

  return NextResponse.json(result)
}
