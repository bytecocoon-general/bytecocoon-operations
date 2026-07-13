/**
 * GET /api/admin/reports/project-financials
 *
 * Per-project financial summary for ADMIN/MANAGER, split into two bases:
 *   - "Efectivo" (cash basis): money that has actually moved —
 *     invoiced = PAID invoices, spent = PAID expenses + labor cost from timesheets
 *     whose employee's Payroll (employeeId+month+year) is PAID.
 *   - "Previsão" (accrual basis): APPROVED expenses + labor cost from APPROVED
 *     timesheets, regardless of whether Payroll/expenses were ever paid.
 *
 * Labor cost mirrors the payroll gross-pay formula in app/api/admin/payroll/route.ts,
 * but aggregated per project instead of per employee, and computed once per
 * timesheet line for both bases (branching into "efectivo" only when that
 * timesheet's employee+month+year has a PAID Payroll).
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentEmployee } from '@/lib/auth'

export async function GET() {
  const actor = await getCurrentEmployee()
  if (!actor) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (actor.role !== 'ADMIN' && actor.role !== 'MANAGER') return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })

  const [projects, invoiceLines, expensesApproved, expensesPaid, paidPayrolls, timesheets] = await Promise.all([
    db.project.findMany({
      select: { id: true, name: true, budget: true, client: { select: { name: true } }, clientName: true },
      orderBy: { name: 'asc' },
    }),
    db.invoiceLine.findMany({
      where: { projectId: { not: null }, invoice: { status: 'PAID' } },
      select: { projectId: true, amount: true },
    }),
    db.expense.groupBy({
      by: ['projectId'],
      where: { status: 'APPROVED', projectId: { not: null } },
      _sum: { amount: true },
    }),
    db.expense.groupBy({
      by: ['projectId'],
      where: { status: 'PAID', projectId: { not: null } },
      _sum: { amount: true },
    }),
    db.payroll.findMany({
      where:  { status: 'PAID' },
      select: { employeeId: true, month: true, year: true },
    }),
    db.timesheet.findMany({
      where: { status: 'APPROVED' },
      select: {
        employeeId: true,
        month:      true,
        year:       true,
        employee:   { select: { hourlyRate: true } },
        lines: {
          where:  { type: 'WORK', projectId: { not: null } },
          select: { projectId: true, hours: true, extraHours: true, overtimeMultiplier: true },
        },
      },
    }),
  ])

  const invoicedByProject: Record<string, number> = {}
  for (const line of invoiceLines) {
    invoicedByProject[line.projectId!] = (invoicedByProject[line.projectId!] ?? 0) + Number(line.amount)
  }

  const expensesForecastByProject: Record<string, number> = {}
  for (const e of expensesApproved) expensesForecastByProject[e.projectId!] = Number(e._sum.amount ?? 0)

  const expensesEffectiveByProject: Record<string, number> = {}
  for (const e of expensesPaid) expensesEffectiveByProject[e.projectId!] = Number(e._sum.amount ?? 0)

  const paidPayrollKeys = new Set(paidPayrolls.map(p => `${p.employeeId}:${p.month}:${p.year}`))

  const laborForecastByProject: Record<string, number> = {}
  const laborEffectiveByProject: Record<string, number> = {}
  for (const ts of timesheets) {
    const rate   = Number(ts.employee.hourlyRate)
    const isPaid = paidPayrollKeys.has(`${ts.employeeId}:${ts.month}:${ts.year}`)

    for (const line of ts.lines) {
      const mult = line.overtimeMultiplier != null ? Number(line.overtimeMultiplier) : 1.5
      const cost = Number(line.hours) * rate + Number(line.extraHours) * rate * mult

      laborForecastByProject[line.projectId!] = (laborForecastByProject[line.projectId!] ?? 0) + cost
      if (isPaid) laborEffectiveByProject[line.projectId!] = (laborEffectiveByProject[line.projectId!] ?? 0) + cost
    }
  }

  const result = projects.map(p => {
    const invoicedEffective = invoicedByProject[p.id] ?? 0
    const spentEffective    = (expensesEffectiveByProject[p.id] ?? 0) + (laborEffectiveByProject[p.id] ?? 0)
    const spentForecast     = (expensesForecastByProject[p.id] ?? 0) + (laborForecastByProject[p.id] ?? 0)
    const budget            = p.budget != null ? Number(p.budget) : null

    return {
      id:             p.id,
      name:           p.name,
      clientName:     p.client?.name ?? p.clientName ?? null,
      invoicedEffective,
      spentEffective,
      spentForecast,
      marginCurrent:  invoicedEffective - spentEffective,
      marginForecast: budget != null ? budget - spentForecast : null,
      budget,
    }
  })

  return NextResponse.json(result)
}
