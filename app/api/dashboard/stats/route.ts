import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Working-days helper (Mon–Fri)
function workingDays(year: number, month: number): number {
  let count = 0
  const d = new Date(year, month - 1, 1)
  while (d.getMonth() === month - 1) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const caller = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!caller || (caller.role !== 'ADMIN' && caller.role !== 'MANAGER')) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const now       = new Date()
  const thisMonth = now.getMonth() + 1
  const thisYear  = now.getFullYear()
  const lastMonth = thisMonth === 1 ? 12 : thisMonth - 1
  const lastYear  = thisMonth === 1 ? thisYear - 1 : thisYear

  const monthStart     = new Date(thisYear, thisMonth - 1, 1)
  const monthEnd       = new Date(thisYear, thisMonth, 0, 23, 59, 59)
  const lastMonthStart = new Date(lastYear, lastMonth - 1, 1)
  const lastMonthEnd   = new Date(lastYear, lastMonth, 0, 23, 59, 59)
  const yearStart      = new Date(thisYear, 0, 1)

  // ── Parallel data fetch ────────────────────────────────────────────────────
  const [
    activeEmployees,
    invoicesMtd,
    invoicesLastMonth,
    invoicesYtd,
    payrollMtd,
    payrollLastMonth,
    billableLines,
    billableLinesLastMonth,
    internalLines,
    target,
    timesheetsMtd,
    allTimesheets,
    projects,
    projectMembers,
    pendingExpenses,
    overdueInvoices,
  ] = await Promise.all([
    // Active headcount
    db.employee.count({ where: { isActive: true } }),

    // Revenue MTD
    db.invoice.aggregate({
      where: { issueDate: { gte: monthStart, lte: monthEnd }, status: { not: 'DRAFT' } },
      _sum: { total: true },
    }),

    // Revenue last month
    db.invoice.aggregate({
      where: { issueDate: { gte: lastMonthStart, lte: lastMonthEnd }, status: { not: 'DRAFT' } },
      _sum: { total: true },
    }),

    // Revenue YTD
    db.invoice.aggregate({
      where: { issueDate: { gte: yearStart }, status: { not: 'DRAFT' } },
      _sum: { total: true },
    }),

    // Payroll cost MTD (gross)
    db.payroll.aggregate({
      where: { month: thisMonth, year: thisYear },
      _sum: { grossPay: true },
    }),

    // Payroll cost last month
    db.payroll.aggregate({
      where: { month: lastMonth, year: lastYear },
      _sum: { grossPay: true },
    }),

    // Billable hours this month (WORK on billable projects)
    db.timesheetLine.findMany({
      where: {
        type: 'WORK',
        date: { gte: monthStart, lte: monthEnd },
        project: { isBillable: true },
      },
      select: { hours: true, extraHours: true },
    }),

    // Billable hours last month
    db.timesheetLine.findMany({
      where: {
        type: 'WORK',
        date: { gte: lastMonthStart, lte: lastMonthEnd },
        project: { isBillable: true },
      },
      select: { hours: true, extraHours: true },
    }),

    // Internal/unallocated hours this month
    db.timesheetLine.findMany({
      where: {
        type: 'WORK',
        date: { gte: monthStart, lte: monthEnd },
        OR: [{ projectId: null }, { project: { isBillable: false } }],
      },
      select: { hours: true },
    }),

    // Monthly targets
    db.operationalTarget.findUnique({ where: { month_year: { month: thisMonth, year: thisYear } } }),

    // Timesheets this month
    db.timesheet.findMany({
      where: { month: thisMonth, year: thisYear },
      include: { employee: { select: { id: true, name: true, isActive: true } } },
    }),

    // All recent timesheets (for trend)
    db.timesheet.findMany({
      where: { OR: [{ month: thisMonth, year: thisYear }, { month: lastMonth, year: lastYear }] },
      select: { month: true, year: true, status: true, employeeId: true },
    }),

    // Active projects with budget
    db.project.findMany({
      where: { isActive: true },
      include: {
        client: { select: { name: true } },
        members: {
          include: {
            employee: {
              select: {
                id: true, name: true, isActive: true,
                skills: { include: { skill: { select: { name: true, category: true } } } },
              },
            },
          },
        },
        skills: { include: { skill: { select: { name: true, category: true } } } },
        timesheetLines: {
          where: { type: 'WORK', date: { gte: monthStart } },
          select: { hours: true },
        },
      },
    }),

    // All project members (for allocation radar)
    db.projectMember.findMany({
      where: { project: { isActive: true } },
      include: {
        employee: { select: { id: true, name: true, hourlyRate: true, isActive: true } },
        project:  { select: { id: true, name: true, isBillable: true } },
      },
    }),

    // Pending expenses
    db.expense.aggregate({
      where: { status: 'SUBMITTED' },
      _sum: { amount: true },
      _count: true,
    }),

    // Overdue invoices
    db.invoice.count({
      where: { status: 'SENT', dueDate: { lt: now } },
    }),
  ])

  // ── KPI calculations ───────────────────────────────────────────────────────

  const revenueMtd      = Number(invoicesMtd._sum.total ?? 0)
  const revenueLastMth  = Number(invoicesLastMonth._sum.total ?? 0)
  const revenueYtd      = Number(invoicesYtd._sum.total ?? 0)
  const payrollCost     = Number(payrollMtd._sum.grossPay ?? 0)
  const payrollLastCost = Number(payrollLastMonth._sum.grossPay ?? 0)

  const billableHours      = billableLines.reduce((s, l) => s + Number(l.hours) + Number(l.extraHours), 0)
  const billableHoursLast  = billableLinesLastMonth.reduce((s, l) => s + Number(l.hours) + Number(l.extraHours), 0)
  const internalHours      = internalLines.reduce((s, l) => s + Number(l.hours), 0)

  const wdThisMonth     = workingDays(thisYear, thisMonth)
  const wdLastMonth     = workingDays(lastYear, lastMonth)
  const availableHours  = activeEmployees * wdThisMonth * 8
  const availableHoursL = activeEmployees * wdLastMonth * 8

  const utilizationMtd  = availableHours  > 0 ? (billableHours      / availableHours)  * 100 : 0
  const utilizationLast = availableHoursL > 0 ? (billableHoursLast  / availableHoursL) * 100 : 0

  const marginMtd  = revenueMtd > 0 && payrollCost > 0
    ? ((revenueMtd - payrollCost) / revenueMtd) * 100 : null
  const marginLast = revenueLastMth > 0 && payrollLastCost > 0
    ? ((revenueLastMth - payrollLastCost) / revenueLastMth) * 100 : null

  // ── Forecast (simple linear projection from YTD) ───────────────────────────
  const monthsElapsed   = thisMonth
  const avgMonthlyRev   = monthsElapsed > 0 ? revenueYtd / monthsElapsed : revenueMtd
  const forecast90Base  = avgMonthlyRev * 3
  const forecast90Best  = forecast90Base * 1.15
  const forecast90Worst = forecast90Base * 0.85

  // Last 6 months for sparkline
  const sparkMonths: Array<{ month: number; year: number; revenue: number }> = []
  for (let i = 5; i >= 0; i--) {
    let m = thisMonth - i
    let y = thisYear
    if (m <= 0) { m += 12; y -= 1 }
    sparkMonths.push({ month: m, year: y, revenue: 0 })
  }
  const sparkInvoices = await db.invoice.findMany({
    where: {
      issueDate: { gte: new Date(sparkMonths[0].year, sparkMonths[0].month - 1, 1) },
      status: { not: 'DRAFT' },
    },
    select: { issueDate: true, total: true },
  })
  for (const inv of sparkInvoices) {
    const m = inv.issueDate.getMonth() + 1
    const y = inv.issueDate.getFullYear()
    const entry = sparkMonths.find(s => s.month === m && s.year === y)
    if (entry) entry.revenue += Number(inv.total)
  }

  // ── Timesheet adherence ────────────────────────────────────────────────────
  const activeTsEmployees = await db.employee.count({ where: { isActive: true } })
  const submittedTs       = timesheetsMtd.filter(t => t.status !== 'DRAFT').length
  const adherence         = activeTsEmployees > 0 ? Math.round((submittedTs / activeTsEmployees) * 100) : 0

  const lastMonthTs        = allTimesheets.filter(t => t.month === lastMonth && t.year === lastYear)
  const lastSubmitted      = lastMonthTs.filter(t => t.status !== 'DRAFT').length
  const lastAdherence      = activeTsEmployees > 0 ? Math.round((lastSubmitted / activeTsEmployees) * 100) : 0
  const adherenceDelta     = adherence - lastAdherence

  // Projects with active members but no TS submitted this month
  const employeesWithTs     = new Set(timesheetsMtd.filter(t => t.status !== 'DRAFT').map(t => t.employeeId))
  const employeesWithoutTs  = projectMembers
    .filter(pm => pm.employee.isActive && !employeesWithTs.has(pm.employeeId) && pm.project.isBillable)
    .map(pm => pm.project.name)
  const projectsWithoutTs   = new Set(employeesWithoutTs).size

  // ── Operational alerts (auto-generated) ───────────────────────────────────
  const operationalAlerts: Array<{
    title: string; subtitle: string; impact: number; severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'; trend: 'UP' | 'STABLE'
  }> = []

  // Over-budget projects
  for (const p of projects) {
    if (!p.budget || !p.isBillable) continue
    const budgetUsed = p.timesheetLines.reduce((s, l) => s + Number(l.hours), 0)
    const budgetTotal = Number(p.budget)
    // Approximate €: hours × avg client rate from members
    const avgRate = p.members.reduce((s, m) => s + Number(m.clientRate), 0) / Math.max(p.members.length, 1)
    const costEstimate = budgetUsed * avgRate
    if (budgetTotal > 0 && costEstimate / budgetTotal > 0.75) {
      const burnPct = Math.round((costEstimate / budgetTotal) * 100)
      operationalAlerts.push({
        title:    `${p.name}`,
        subtitle: `Burn ${burnPct}% do budget acumulado`,
        impact:   Math.round(costEstimate - budgetTotal * 0.8),
        severity: burnPct >= 90 ? 'CRITICAL' : 'HIGH',
        trend:    'UP',
      })
    }
  }

  // Low timesheet adherence
  if (adherence < 70) {
    operationalAlerts.push({
      title:    `Aderência a timesheets: ${adherence}%`,
      subtitle: `${activeTsEmployees - submittedTs} colaboradores sem TS submetida`,
      impact:   Math.round(internalHours * (avgMonthlyRev / Math.max(availableHours, 1))),
      severity: adherence < 50 ? 'CRITICAL' : 'HIGH',
      trend:    adherenceDelta < 0 ? 'UP' : 'STABLE',
    })
  }

  // High internal hours
  if (internalHours > availableHours * 0.3) {
    operationalAlerts.push({
      title:    `${Math.round(internalHours)}h não faturáveis este mês`,
      subtitle: `${Math.round((internalHours / Math.max(availableHours, 1)) * 100)}% das horas disponíveis sem faturação`,
      impact:   Math.round(internalHours * (revenueMtd / Math.max(billableHours + internalHours, 1))),
      severity: 'MEDIUM',
      trend:    'STABLE',
    })
  }

  // Overdue invoices
  if (overdueInvoices > 0) {
    operationalAlerts.push({
      title:    `${overdueInvoices} fatura${overdueInvoices > 1 ? 's' : ''} em atraso`,
      subtitle: 'Facturas enviadas e não pagas após data de vencimento',
      impact:   0,
      severity: overdueInvoices > 3 ? 'CRITICAL' : 'HIGH',
      trend:    'STABLE',
    })
  }

  // ── Priority alerts (top 5 by severity+impact) ────────────────────────────
  const priorityAlerts: Array<{
    project: string; client: string; risk: string
    probability: number; impact: number
    cause: string; action: string
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM'
  }> = []

  for (const p of projects) {
    if (!p.isBillable) continue
    const budget = Number(p.budget ?? 0)
    if (!budget) continue
    const monthlyHours = p.timesheetLines.reduce((s, l) => s + Number(l.hours), 0)
    const avgRate = p.members.reduce((s, m) => s + Number(m.clientRate), 0) / Math.max(p.members.length, 1)
    const burn = monthlyHours * avgRate
    const burnPct = budget > 0 ? (burn / budget) * 100 : 0

    if (burnPct >= 70) {
      priorityAlerts.push({
        project:     p.name,
        client:      p.client?.name ?? '—',
        risk:        `Risco de overbudget: ${Math.round(burnPct)}%`,
        probability: Math.min(Math.round(burnPct), 95),
        impact:      Math.round(Math.max(burn - budget, 0)),
        cause:       'Horas acumuladas acima do previsto',
        action:      'Rever scope ou renegociar contrato',
        severity:    burnPct >= 90 ? 'CRITICAL' : burnPct >= 80 ? 'HIGH' : 'MEDIUM',
      })
    }
  }

  // Pending timesheet approvals
  const pendingApprovals = timesheetsMtd.filter(t => t.status === 'SUBMITTED').length
  if (pendingApprovals > 0) {
    priorityAlerts.push({
      project:     'Gestão de Timesheets',
      client:      '—',
      risk:        `${pendingApprovals} TS pendentes de aprovação`,
      probability: 60,
      impact:      0,
      cause:       'Baixa aderência de aprovação',
      action:      'Aprovar timesheets em atraso',
      severity:    pendingApprovals > 5 ? 'HIGH' : 'MEDIUM',
    })
  }

  // ── Staffing radar ─────────────────────────────────────────────────────────
  const employeeAllocation: Record<string, number> = {}
  for (const pm of projectMembers) {
    if (!pm.employee.isActive) continue
    employeeAllocation[pm.employeeId] = (employeeAllocation[pm.employeeId] ?? 0) + 100 // simplified: each PM = 100%
  }

  const allActiveEmps    = await db.employee.findMany({ where: { isActive: true }, select: { id: true } })
  const staffingRadar    = { available: 0, underallocated: 0, wellAllocated: 0, overallocated: 0, burnoutRisk: 0 }
  const staffingSuggestions: Array<{
    id: string; name: string; skills: string[]; fitsProjects: number; status: string; availableIn: number | null
  }> = []

  for (const emp of allActiveEmps) {
    const allocation = employeeAllocation[emp.id] ?? 0
    let status: string

    if (allocation === 0)       { staffingRadar.available++;      status = 'DISPONÍVEL'  }
    else if (allocation < 60)   { staffingRadar.underallocated++; status = 'SUBALOCADO'  }
    else if (allocation <= 100) { staffingRadar.wellAllocated++;  status = 'ALOCADO'     }
    else                        { staffingRadar.overallocated++;  status = 'SOBREALOC.'  }

    if (allocation === 0 || allocation < 60) {
      // Look up employee data from projects (which include skills) or projectMembers (for name)
      const empMember = projects.flatMap(p => p.members).find(m => m.employeeId === emp.id)
      const empBasic  = projectMembers.find(pm => pm.employeeId === emp.id)?.employee
      const empName   = empMember?.employee.name ?? empBasic?.name
      if (empName) {
        const empSkills = empMember
          ? empMember.employee.skills.map((s: { skill: { name: string } }) => s.skill.name)
          : []
        const fits = projects.filter(p =>
          p.isActive && p.isBillable &&
          p.skills.some((ps: { skill: { name: string } }) => empSkills.includes(ps.skill.name))
        ).length

        staffingSuggestions.push({
          id:           emp.id,
          name:         empName,
          skills:       empSkills.slice(0, 4),
          fitsProjects: fits,
          status,
          availableIn:  0,
        })
      }
    }
  }

  // ── Heatmap ────────────────────────────────────────────────────────────────
  type HeatStatus = 'OK' | 'ATTENTION' | 'CRITICAL'
  const heatmap: Record<string, HeatStatus> = {
    delivery:   adherence >= 80 ? 'OK' : adherence >= 60 ? 'ATTENTION' : 'CRITICAL',
    staffing:   staffingRadar.available === 0 && staffingRadar.overallocated === 0 ? 'OK'
                : staffingRadar.overallocated > 2 || staffingRadar.available > 3 ? 'CRITICAL' : 'ATTENTION',
    financeiro: marginMtd != null && marginMtd >= 20 ? 'OK' : marginMtd != null && marginMtd >= 10 ? 'ATTENTION' : 'CRITICAL',
    clientes:   overdueInvoices === 0 ? 'OK' : overdueInvoices < 3 ? 'ATTENTION' : 'CRITICAL',
    projectos:  operationalAlerts.filter(a => a.severity === 'CRITICAL').length === 0 ? 'OK'
                : operationalAlerts.filter(a => a.severity === 'CRITICAL').length < 2 ? 'ATTENTION' : 'CRITICAL',
    qualidade:  'OK', // placeholder
  }

  // ── Return ─────────────────────────────────────────────────────────────────
  return NextResponse.json({
    // KPIs
    revenueMtd,
    revenueLastMonth: revenueLastMth,
    revenueTarget:    Number(target?.revenueTarget ?? 0) || null,
    revenueYtd,

    marginMtd:    marginMtd ?? 0,
    marginLast:   marginLast ?? 0,
    marginTarget: Number(target?.marginTarget ?? 0) || null,

    utilizationMtd,
    utilizationLast,
    utilizationTarget: Number(target?.utilizationTarget ?? 0) || null,

    unallocatedHours:     internalHours,
    unallocatedHoursLast: 0,

    billableHours,
    availableHours,
    activeEmployees,
    pendingApprovals,
    pendingExpenses: Number(pendingExpenses._sum.amount ?? 0),

    projectsAtRisk: priorityAlerts.filter(a => a.severity === 'CRITICAL').length,
    projectsTotal:  projects.filter(p => p.isBillable).length,

    forecast90Base,
    forecast90Best,
    forecast90Worst,
    forecastBaseProbability: 50,

    sparkRevenue: sparkMonths,

    heatmap,
    staffingRadar,
    staffingSuggestions: staffingSuggestions.slice(0, 3),

    timesheetAdherence:       adherence,
    adherenceDelta,
    projectsWithoutTimesheet: projectsWithoutTs,
    internalHoursPercent:     availableHours > 0 ? Math.round((internalHours / availableHours) * 100) : 0,

    operationalAlerts: operationalAlerts.slice(0, 4),
    priorityAlerts:    priorityAlerts.slice(0, 5),
  })
}
