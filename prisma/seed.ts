/**
 * prisma/seed.ts — Cocoon Ops staging seed (2026 — realistic data)
 *
 * Period: January 2026 → 24 May 2026
 * Team  : 4 departments · 6 employees · 4 clients · 5 active projects
 * Story : Company growing — EDP onboards in Feb, JM in Mar, revenue near target
 *
 * Status ladder:
 *   Jan–Apr 2026 : APPROVED
 *   May 2026     : SUBMITTED  (days 4–22, May 1 = Labour Day holiday)
 *
 * Financial profile (ex-VAT invoices):
 *   Jan  €72 000  |  payroll ~€62 000  |  margin ~14 %
 *   Feb  €88 000  |  payroll ~€62 000  |  margin ~29 %
 *   Mar  €98 000  |  payroll ~€62 000  |  margin ~37 %
 *   Apr  €98 000  |  payroll ~€62 000  |  margin ~37 %
 *   May  €98 000  |  payroll ~€62 000  |  (SENT — not yet paid)
 *
 * Run via:
 *   DATABASE_URL="<url>" npx prisma migrate reset --force
 */

import { PrismaClient, Prisma } from '@prisma/client'

const db = new PrismaClient()

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Portuguese public holidays that fall on a weekday in Jan–May 2026 */
const PT_HOLIDAYS = new Set([
  '2026-01-01', // Ano Novo  (Thursday)
  '2026-05-01', // Dia do Trabalhador (Friday)
])

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Returns all working days (Mon–Fri, excluding PT_HOLIDAYS) in a month. */
function workingDays(year: number, month: number, maxDay?: number): Date[] {
  const days: Date[] = []
  const d = new Date(year, month - 1, 1)
  while (d.getMonth() === month - 1) {
    if (maxDay !== undefined && d.getDate() > maxDay) break
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6 && !PT_HOLIDAYS.has(iso(d))) {
      days.push(new Date(d))
    }
    d.setDate(d.getDate() + 1)
  }
  return days
}

function dec(n: number): Prisma.Decimal { return new Prisma.Decimal(n) }
function dt(y: number, m: number, d: number): Date { return new Date(y, m - 1, d) }

/**
 * Realistic daily hours: 8 h most days, 7 h on some Fridays, 9 h on crunch days.
 * Cycles through a 20-item pattern so each month feels slightly different.
 */
const HOURS_PAT  = [8, 8, 8, 8, 7,  8, 8, 9, 8, 7,  8, 8, 8, 8, 7,  9, 8, 8, 8, 7]
const EXTRA_PAT  = [0, 0, 0, 0, 0,  0, 1, 0, 0, 0,  0, 0, 0, 0, 0,  2, 0, 0, 0, 0]

function hours(idx: number): number { return HOURS_PAT[idx % HOURS_PAT.length] }
function extra(idx: number): number { return EXTRA_PAT[idx % EXTRA_PAT.length] }

// ── Master data ───────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  { key: 'dev',    name: 'Desenvolvimento de Software' },
  { key: 'design', name: 'Design & UX'                 },
  { key: 'pm',     name: 'Gestão de Projecto'          },
  { key: 'admin',  name: 'Administração'               },
]

const EMPLOYEES = [
  // rate = cost-per-hour (monthly salary ÷ 168 h), not billing rate
  { clerkId: 'demo_emp_ana',   name: 'Ana Ferreira',    email: 'ana.ferreira@cocoonops.demo',    dept: 'dev',    role: 'MANAGER',  rate: 75 },
  { clerkId: 'demo_emp_joao',  name: 'João Santos',     email: 'joao.santos@cocoonops.demo',     dept: 'dev',    role: 'EMPLOYEE', rate: 65 },
  { clerkId: 'demo_emp_pedro', name: 'Pedro Oliveira',  email: 'pedro.oliveira@cocoonops.demo',  dept: 'dev',    role: 'EMPLOYEE', rate: 70 },
  { clerkId: 'demo_emp_mari',  name: 'Mariana Costa',   email: 'mariana.costa@cocoonops.demo',   dept: 'design', role: 'EMPLOYEE', rate: 60 },
  { clerkId: 'demo_emp_sofia', name: 'Sofia Rodrigues', email: 'sofia.rodrigues@cocoonops.demo', dept: 'pm',     role: 'EMPLOYEE', rate: 55 },
  { clerkId: 'demo_emp_rui',   name: 'Rui Mendes',      email: 'rui.mendes@cocoonops.demo',      dept: 'admin',  role: 'EMPLOYEE', rate: 45 },
]

const CLIENTS = [
  { key: 'mbcp', name: 'Millennium BCP',   email: 'projetos@millenniumbcp.pt',  vatNumber: 'PT501525882', country: 'Portugal' },
  { key: 'nos',  name: 'NOS Comunicações', email: 'fornecedores@nos.pt',        vatNumber: 'PT502578141', country: 'Portugal' },
  { key: 'edp',  name: 'EDP Renováveis',   email: 'procurement@edpr.com',       vatNumber: 'PT504506152', country: 'Portugal' },
  { key: 'jm',   name: 'Jerónimo Martins', email: 'it@jeronimomartins.com',     vatNumber: 'PT500100144', country: 'Portugal' },
]

const PROJECT_DEFS = [
  { key: 'pag',  name: 'Plataforma de Pagamentos',  client: 'mbcp', contractType: 'TIME_AND_MATERIALS', contractStatus: 'ACTIVE',  startDate: dt(2026,1,1),  endDate: dt(2026,12,31), budget: 380_000, billable: true,  active: true  },
  { key: 'app',  name: 'App Mobile MBcp',            client: 'mbcp', contractType: 'TIME_AND_MATERIALS', contractStatus: 'ACTIVE',  startDate: dt(2026,1,1),  endDate: dt(2026,12,31), budget: 220_000, billable: true,  active: true  },
  { key: 'nos',  name: 'Portal Self-Service NOS',    client: 'nos',  contractType: 'TIME_AND_MATERIALS', contractStatus: 'ACTIVE',  startDate: dt(2026,1,1),  endDate: dt(2026,9,30),  budget: 280_000, billable: true,  active: true  },
  { key: 'edp',  name: 'Dashboard EDP Renováveis',   client: 'edp',  contractType: 'FIXED',              contractStatus: 'ACTIVE',  startDate: dt(2026,2,1),  endDate: dt(2026,8,31),  budget: 150_000, billable: true,  active: true  },
  { key: 'jm',   name: 'Sistema de Inventário JM',   client: 'jm',   contractType: 'FIXED',              contractStatus: 'ACTIVE',  startDate: dt(2026,3,1),  endDate: dt(2026,7,31),  budget:  90_000, billable: true,  active: true  },
  { key: 'core', name: 'Migração Core Banking 2024', client: 'mbcp', contractType: 'TIME_AND_MATERIALS', contractStatus: 'EXPIRED', startDate: dt(2024,1,1),  endDate: dt(2024,12,31), budget: 220_000, billable: true,  active: false },
  { key: 'int',  name: 'Operações Internas',          client: null,   contractType: null,                 contractStatus: null,      startDate: null,           endDate: null,            budget:       0, billable: false, active: true  },
]

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  Seeding Cocoon Ops (Jan–May 2026)…\n')

  // ── 1. Departments ─────────────────────────────────────────────────────────
  console.log('  [1/14] Departments…')
  const deptMap: Record<string, string> = {}
  for (const d of DEPARTMENTS) {
    const rec = await db.department.upsert({
      where: { name: d.name }, update: {}, create: { name: d.name },
    })
    deptMap[d.key] = rec.id
  }

  // ── 2. Employees ───────────────────────────────────────────────────────────
  console.log('  [2/14] Employees…')
  const empMap: Record<string, string> = {}  // clerkId → db id
  for (const e of EMPLOYEES) {
    const emp = await db.employee.upsert({
      where:  { clerkId: e.clerkId },
      update: { name: e.name, email: e.email, hourlyRate: dec(e.rate), role: e.role, departmentId: deptMap[e.dept] },
      create: { clerkId: e.clerkId, name: e.name, email: e.email, hourlyRate: dec(e.rate), role: e.role, departmentId: deptMap[e.dept] },
    })
    empMap[e.clerkId] = emp.id
  }
  const A   = empMap['demo_emp_ana']
  const B   = empMap['demo_emp_joao']
  const C   = empMap['demo_emp_pedro']
  const D   = empMap['demo_emp_mari']
  const E   = empMap['demo_emp_sofia']
  const F   = empMap['demo_emp_rui']

  // ── 3. Clients ─────────────────────────────────────────────────────────────
  console.log('  [3/14] Clients…')
  const clientMap: Record<string, string> = {}
  for (const c of CLIENTS) {
    const { key, ...data } = c
    let rec = await db.client.findFirst({ where: { email: data.email } })
    if (!rec) rec = await db.client.create({ data })
    clientMap[key] = rec.id
  }

  // ── 4. Projects ────────────────────────────────────────────────────────────
  console.log('  [4/14] Projects…')
  const projMap: Record<string, string> = {}
  for (const p of PROJECT_DEFS) {
    let rec = await db.project.findFirst({ where: { name: p.name } })
    if (!rec) {
      rec = await db.project.create({
        data: {
          name:           p.name,
          clientId:       p.client ? clientMap[p.client] : null,
          budget:         p.budget ? dec(p.budget)       : null,
          isBillable:     p.billable,
          isActive:       p.active,
          contractType:   p.contractType,
          contractStatus: p.contractStatus,
          startDate:      p.startDate,
          endDate:        p.endDate,
          currency:       'EUR',
        },
      })
    } else {
      await db.project.update({ where: { id: rec.id }, data: { isBillable: p.billable, isActive: p.active } })
    }
    projMap[p.key] = rec.id
  }
  const PAG  = projMap['pag']
  const APP  = projMap['app']
  const NOS  = projMap['nos']
  const EDP  = projMap['edp']
  const JM   = projMap['jm']
  const INT  = projMap['int']

  // ── 6. ProjectMember allocations ──────────────────────────────────────────
  console.log('  [6/14] ProjectMember allocations…')

  //  emp,  proj,  role,                clientRate, otAllowed, otWkd, otWke, onCall, onCallRate, exp,   expLimit
  const MEMBERS = [
    // Ana — Tech Lead (billing: €100/h) — PAG + APP, overtime + on-call on PAG
    [A, PAG, 'Tech Lead',       100, true,  1.5, 2.0, true,  300, true,  null  ],
    [A, APP, 'Tech Lead',       100, true,  1.5, 2.0, false,   0, true,   500  ],
    // João — Backend Developer (billing: €82/h) — PAG + NOS
    [B, PAG, 'Developer',        82, true,  1.5, 2.0, false,   0, true,   300  ],
    [B, NOS, 'Developer',        82, false, 1.5, 2.0, false,   0, false, null  ],
    // Pedro — Senior Developer (billing: €95/h) — NOS + EDP
    [C, NOS, 'Senior Developer', 95, true,  1.5, 2.0, true,  250, true,  null  ],
    [C, EDP, 'Developer',        90, false, 1.5, 2.0, false,   0, false, null  ],
    // Mariana — UX/UI Designer (billing: €78/h) — APP + EDP
    [D, APP, 'UX Designer',      78, false, 1.5, 2.0, false,   0, true,   200  ],
    [D, EDP, 'UI Designer',      78, false, 1.5, 2.0, false,   0, false, null  ],
    // Sofia — Project Manager (billing: €72/h) — JM + NOS
    [E, JM,  'Project Manager',  72, false, 1.5, 2.0, false,   0, true,   400  ],
    [E, NOS, 'Project Manager',  72, false, 1.5, 2.0, false,   0, false, null  ],
    // Rui — Admin (internal only)
    [F, INT, 'Administrativo',    0, false, 1.5, 2.0, false,   0, true,   150  ],
  ] as const

  for (const [empId, projId, role, cr, otA, otWkd, otWke, ocA, ocR, expA, expL] of MEMBERS) {
    const exists = await db.projectMember.findUnique({
      where: { projectId_employeeId: { projectId: projId, employeeId: empId } },
    })
    if (!exists) {
      await db.projectMember.create({
        data: {
          projectId: projId, employeeId: empId, role,
          clientRate: dec(cr),
          overtimeAllowed: otA, overtimeWeekdayMultiplier: dec(otWkd), overtimeWeekendMultiplier: dec(otWke),
          onCallAllowed: ocA, onCallWeeklyRate: dec(ocR),
          expensesAllowed: expA, expensesMonthlyLimit: expL ? dec(expL) : null,
        },
      })
    }
  }

  // ── 7. Timesheets (Jan–May 2026) ──────────────────────────────────────────
  console.log('  [7/14] Timesheets…')

  /**
   * Day-of-week → project schedule for each employee.
   * 1=Mon … 5=Fri.  Rui always logs to INT.
   */
  const SCHEDULES: Record<string, Record<number, string>> = {
    demo_emp_ana:   { 1: PAG, 2: PAG, 3: PAG, 4: APP, 5: APP  },
    demo_emp_joao:  { 1: PAG, 2: PAG, 3: PAG, 4: NOS, 5: PAG  },
    demo_emp_pedro: { 1: NOS, 2: NOS, 3: NOS, 4: NOS, 5: EDP  },
    demo_emp_mari:  { 1: APP, 2: APP, 3: APP, 4: EDP, 5: EDP  },
    demo_emp_sofia: { 1: JM,  2: JM,  3: NOS, 4: NOS, 5: NOS  },
    demo_emp_rui:   { 1: INT, 2: INT, 3: INT, 4: INT, 5: INT  },
  }

  /**
   * Days to mark as VACATION (employee clerkId → list of ISO date strings).
   * Adds realistic absence patterns without overcomplicating the seed.
   */
  const VACATION_DAYS: Record<string, string[]> = {
    demo_emp_ana:   ['2026-02-16', '2026-02-17'],                         // long weekend Feb
    demo_emp_joao:  ['2026-03-30', '2026-03-31'],                         // Easter week
    demo_emp_pedro: ['2026-04-02', '2026-04-03'],                         // Easter week
    demo_emp_mari:  ['2026-03-02', '2026-03-03'],                         // long weekend Mar
    demo_emp_sofia: ['2026-04-28', '2026-04-29', '2026-04-30'],           // end of April
    demo_emp_rui:   ['2026-01-19', '2026-01-20', '2026-01-21'],           // 3-day break
  }

  const MONTHS = [
    { m: 1, y: 2026, status: 'APPROVED',  maxDay: undefined   },
    { m: 2, y: 2026, status: 'APPROVED',  maxDay: undefined   },
    { m: 3, y: 2026, status: 'APPROVED',  maxDay: undefined   },
    { m: 4, y: 2026, status: 'APPROVED',  maxDay: undefined   },
    { m: 5, y: 2026, status: 'SUBMITTED', maxDay: 22          }, // up to Fri 22 May
  ]

  let tsCount = 0
  for (const empDef of EMPLOYEES) {
    const empId   = empMap[empDef.clerkId]
    const sched   = SCHEDULES[empDef.clerkId]
    const vacSet  = new Set(VACATION_DAYS[empDef.clerkId] ?? [])

    for (const { m, y, status, maxDay } of MONTHS) {
      const existing = await db.timesheet.findUnique({
        where: { employeeId_month_year: { employeeId: empId, month: m, year: y } },
      })
      if (existing) continue

      const days = workingDays(y, m, maxDay)
      const lines: Prisma.TimesheetLineCreateManyTimesheetInput[] = []

      days.forEach((date, idx) => {
        const dateStr = iso(date)
        const dow     = date.getDay() as 1 | 2 | 3 | 4 | 5

        if (vacSet.has(dateStr)) {
          // Vacation — 8 h, no project, type VACATION
          lines.push({ date, projectId: null, type: 'VACATION', hours: dec(8), extraHours: dec(0) })
        } else {
          const projId = sched[dow]
          const h  = hours(idx)
          const ex = extra(idx)
          lines.push({ date, projectId: projId, type: 'WORK', hours: dec(h), extraHours: dec(ex) })
        }
      })

      // Compute timestamps
      const lastDay      = days[days.length - 1]
      const submittedAt  = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + (status === 'SUBMITTED' ? 1 : 1))
      const reviewedAt   = status === 'APPROVED' ? new Date(lastDay.getFullYear(), lastDay.getMonth() + 1, 3) : null

      await db.timesheet.create({
        data: {
          employeeId:  empId,
          month: m, year: y, status,
          submittedAt,
          reviewedAt,
          reviewedBy: reviewedAt ? A : null,   // Ana approves all
          lines: { createMany: { data: lines } },
          auditLogs: {
            create: [
              { action: 'SUBMITTED', performedBy: empId,         createdAt: submittedAt },
              ...(reviewedAt ? [{ action: 'APPROVED', performedBy: A, createdAt: reviewedAt }] : []),
            ],
          },
        },
      })
      tsCount++
    }
  }

  // ── 8. Payroll (Jan–May 2026) ─────────────────────────────────────────────
  console.log('  [8/14] Payroll…')

  for (const empDef of EMPLOYEES) {
    const empId = empMap[empDef.clerkId]
    for (const { m, y, maxDay } of MONTHS) {
      const exists = await db.payroll.findUnique({
        where: { employeeId_month_year: { employeeId: empId, month: m, year: y } },
      })
      if (exists) continue

      const wdays    = workingDays(y, m, maxDay)
      const regHours = wdays.length * 8
      // ~1 h overtime per week on average
      const otHours  = Math.round(wdays.length / 5)
      const gross    = (regHours * empDef.rate) + (otHours * empDef.rate * 1.5)
      const ded      = gross * 0.27          // approx IRS + SS
      const net      = gross - ded

      const payStatus  = m <= 4 ? 'PAID' : 'PROCESSED'
      const processedAt = new Date(y, m, 5)
      const paidAt      = payStatus === 'PAID' ? new Date(y, m, 28) : null

      await db.payroll.create({
        data: {
          employeeId: empId, month: m, year: y, status: payStatus,
          regularHours:  dec(regHours),
          overtimeHours: dec(otHours),
          hourlyRate:    dec(empDef.rate),
          grossPay:      dec(Math.round(gross * 100) / 100),
          deductions:    dec(Math.round(ded   * 100) / 100),
          netPay:        dec(Math.round(net   * 100) / 100),
          processedAt, paidAt,
        },
      })
    }
  }

  // ── 9. Invoices (monthly, ex-VAT subtotals) ───────────────────────────────
  console.log('  [9/14] Invoices…')

  /**
   * Monthly invoice amounts per client (ex-VAT).
   *  MBCP  : active from Jan  — PAG (Ana + João) + APP (Ana + Mariana)
   *  NOS   : active from Jan  — Portal (João + Pedro + Sofia)
   *  EDP   : active from Feb  — Dashboard (Mariana + Pedro)
   *  JM    : active from Mar  — Inventário (Sofia)
   */
  type InvoiceSchedule = {
    client: string; startMonth: number; amounts: Record<number, number>; projects: string[]
  }
  const INVOICE_SCHEDULES: InvoiceSchedule[] = [
    {
      client: 'mbcp', startMonth: 1,
      amounts: { 1: 42_000, 2: 42_000, 3: 43_500, 4: 43_500, 5: 43_500 },
      projects: [PAG, APP],
    },
    {
      client: 'nos', startMonth: 1,
      amounts: { 1: 30_000, 2: 30_500, 3: 31_000, 4: 31_000, 5: 31_000 },
      projects: [NOS],
    },
    {
      client: 'edp', startMonth: 2,                        // first invoice Feb
      amounts: { 2: 15_500, 3: 15_500, 4: 15_500, 5: 15_500 },
      projects: [EDP],
    },
    {
      client: 'jm', startMonth: 3,                         // first invoice Mar
      amounts: { 3: 9_200, 4: 9_200, 5: 9_200 },
      projects: [JM],
    },
  ]

  let invSeq = 1
  for (const { m, y } of MONTHS) {
    for (const sched of INVOICE_SCHEDULES) {
      if (m < sched.startMonth) continue
      const subtotal = sched.amounts[m]
      if (!subtotal) continue

      const exists = await db.invoice.findFirst({
        where: { clientId: clientMap[sched.client], issueDate: { gte: dt(y, m, 1), lte: dt(y, m, 28) } },
      })
      if (exists) continue

      const invNum    = `FT${y}/${String(invSeq).padStart(4, '0')}`; invSeq++
      const taxAmt    = Math.round(subtotal * 0.23 * 100) / 100
      const total     = subtotal + taxAmt

      // Jan–Apr: PAID; May: SENT
      const invStatus = m <= 4 ? 'PAID' : 'SENT'
      const issueDate = dt(y, m, 28)
      const dueDate   = m === 12 ? dt(y + 1, 1, 28) : dt(y, m + 1, 28)

      await db.invoice.create({
        data: {
          invoiceNumber: invNum, clientId: clientMap[sched.client],
          issueDate, dueDate, status: invStatus,
          currency: 'EUR', taxRate: dec(23),
          subtotal: dec(subtotal), taxAmount: dec(taxAmt), total: dec(total),
          notes: `Serviços de consultoria IT — ${new Date(y, m - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}`,
          lines: {
            create: sched.projects.map(pid => ({
              projectId:   pid,
              description: 'Prestação de serviços de consultoria IT',
              quantity:    dec(Math.round(subtotal / sched.projects.length / 100)),
              unitPrice:   dec(100),
              amount:      dec(Math.round(subtotal / sched.projects.length)),
            })),
          },
        },
      })
    }
  }

  // ── 10. Expenses (Jan–May 2026, varied and realistic) ─────────────────────
  console.log('  [10/14] Expenses…')

  const EXP_DEFS = [
    // Jan — team returns from holiday, some transport/setup costs
    { emp: 'demo_emp_ana',   d: dt(2026,1,7),  cat: 'Transporte',            amount: 38.50, desc: 'Táxi para reunião kick-off MBCP',      proj: 'pag',  status: 'APPROVED', rev: 'demo_emp_ana',   note: null },
    { emp: 'demo_emp_joao',  d: dt(2026,1,12), cat: 'Refeição',              amount: 22.00, desc: 'Almoço de trabalho — equipa PAG',      proj: 'pag',  status: 'APPROVED', rev: 'demo_emp_ana',   note: null },
    { emp: 'demo_emp_pedro', d: dt(2026,1,14), cat: 'Material de Escritório', amount: 89.90, desc: 'Monitor portátil para teletrabalho',   proj: null,   status: 'APPROVED', rev: 'demo_emp_ana',   note: null },
    { emp: 'demo_emp_sofia', d: dt(2026,1,20), cat: 'Refeição',              amount: 34.50, desc: 'Jantar de equipa — fecho sprint JM',   proj: 'jm',   status: 'APPROVED', rev: 'demo_emp_ana',   note: null },
    { emp: 'demo_emp_rui',   d: dt(2026,1,22), cat: 'Telecomunicações',      amount: 25.00, desc: 'Plano de dados adicional — Jan',       proj: null,   status: 'APPROVED', rev: 'demo_emp_ana',   note: null },

    // Feb — EDP onboards, some travel to Porto
    { emp: 'demo_emp_ana',   d: dt(2026,2,4),  cat: 'Transporte',            amount: 52.00, desc: 'Comboio Lisboa–Porto (reunião EDP)',   proj: 'edp',  status: 'APPROVED', rev: 'demo_emp_ana',   note: null },
    { emp: 'demo_emp_ana',   d: dt(2026,2,4),  cat: 'Alojamento',            amount: 95.00, desc: 'Hotel Porto — reunião EDP',            proj: 'edp',  status: 'APPROVED', rev: 'demo_emp_ana',   note: null },
    { emp: 'demo_emp_mari',  d: dt(2026,2,5),  cat: 'Transporte',            amount: 52.00, desc: 'Comboio Lisboa–Porto (reunião EDP)',   proj: 'edp',  status: 'APPROVED', rev: 'demo_emp_ana',   note: null },
    { emp: 'demo_emp_mari',  d: dt(2026,2,5),  cat: 'Alojamento',            amount: 95.00, desc: 'Hotel Porto — reunião EDP',            proj: 'edp',  status: 'APPROVED', rev: 'demo_emp_ana',   note: null },
    { emp: 'demo_emp_pedro', d: dt(2026,2,18), cat: 'Formação',              amount: 420.00, desc: 'Certificação AWS Solutions Architect', proj: 'nos',  status: 'APPROVED', rev: 'demo_emp_ana',   note: null },
    { emp: 'demo_emp_joao',  d: dt(2026,2,26), cat: 'Refeição',              amount: 19.50, desc: 'Almoço cliente NOS',                   proj: 'nos',  status: 'APPROVED', rev: 'demo_emp_ana',   note: null },

    // Mar — JM project kicks off, training + client visits
    { emp: 'demo_emp_sofia', d: dt(2026,3,3),  cat: 'Transporte',            amount: 28.00, desc: 'Uber para kick-off JM — Cascais',     proj: 'jm',   status: 'APPROVED', rev: 'demo_emp_ana',   note: null },
    { emp: 'demo_emp_sofia', d: dt(2026,3,3),  cat: 'Refeição',              amount: 41.00, desc: 'Almoço kick-off equipa JM',           proj: 'jm',   status: 'APPROVED', rev: 'demo_emp_ana',   note: null },
    { emp: 'demo_emp_ana',   d: dt(2026,3,10), cat: 'Refeição',              amount: 67.50, desc: 'Jantar de negócio — direcção MBCP',   proj: 'pag',  status: 'APPROVED', rev: 'demo_emp_ana',   note: null },
    { emp: 'demo_emp_pedro', d: dt(2026,3,17), cat: 'Formação',              amount: 280.00, desc: 'Workshop Kubernetes avançado',        proj: 'nos',  status: 'APPROVED', rev: 'demo_emp_ana',   note: null },
    { emp: 'demo_emp_joao',  d: dt(2026,3,24), cat: 'Material de Escritório', amount: 125.00, desc: 'Licença JetBrains anual',           proj: null,   status: 'REJECTED', rev: 'demo_emp_ana',   note: 'Licenças de software requerem aprovação prévia da direcção. Submeter via procurement.' },
    { emp: 'demo_emp_rui',   d: dt(2026,3,28), cat: 'Telecomunicações',      amount: 25.00, desc: 'Plano de dados adicional — Mar',      proj: null,   status: 'APPROVED', rev: 'demo_emp_ana',   note: null },

    // Apr — busy quarter-end, travel + equipment
    { emp: 'demo_emp_ana',   d: dt(2026,4,7),  cat: 'Transporte',            amount: 44.00, desc: 'Voo TAP Lisboa–Madrid (sprint review)', proj: 'pag', status: 'APPROVED', rev: 'demo_emp_ana',   note: null },
    { emp: 'demo_emp_ana',   d: dt(2026,4,7),  cat: 'Alojamento',            amount: 132.00, desc: 'Hotel Madrid — 2 noites',             proj: 'pag',  status: 'APPROVED', rev: 'demo_emp_ana',   note: null },
    { emp: 'demo_emp_pedro', d: dt(2026,4,14), cat: 'Material de Escritório', amount: 59.90, desc: 'Headset USB para calls com cliente',  proj: null,   status: 'APPROVED', rev: 'demo_emp_ana',   note: null },
    { emp: 'demo_emp_mari',  d: dt(2026,4,15), cat: 'Software',              amount: 189.00, desc: 'Licença Figma anual (design team)',   proj: null,   status: 'APPROVED', rev: 'demo_emp_ana',   note: null },
    { emp: 'demo_emp_sofia', d: dt(2026,4,22), cat: 'Refeição',              amount: 38.00, desc: 'Almoço de retrospetiva — equipa JM',  proj: 'jm',   status: 'APPROVED', rev: 'demo_emp_ana',   note: null },
    { emp: 'demo_emp_joao',  d: dt(2026,4,28), cat: 'Transporte',            amount: 18.50, desc: 'Uber para instalações MBCP',          proj: 'pag',  status: 'APPROVED', rev: 'demo_emp_ana',   note: null },

    // May — submitted, awaiting review
    { emp: 'demo_emp_ana',   d: dt(2026,5,6),  cat: 'Transporte',            amount: 49.00, desc: 'Comboio Porto–Lisboa (reunião NOS)',  proj: 'nos',  status: 'SUBMITTED', rev: null, note: null },
    { emp: 'demo_emp_ana',   d: dt(2026,5,6),  cat: 'Refeição',              amount: 28.50, desc: 'Almoço com equipa NOS — Porto',      proj: 'nos',  status: 'SUBMITTED', rev: null, note: null },
    { emp: 'demo_emp_pedro', d: dt(2026,5,8),  cat: 'Formação',              amount: 350.00, desc: 'Conferência Cloud & DevOps 2026',   proj: null,   status: 'SUBMITTED', rev: null, note: null },
    { emp: 'demo_emp_joao',  d: dt(2026,5,13), cat: 'Refeição',              amount: 24.00, desc: 'Almoço equipa pagamentos',           proj: 'pag',  status: 'SUBMITTED', rev: null, note: null },
    { emp: 'demo_emp_mari',  d: dt(2026,5,14), cat: 'Telecomunicações',      amount: 25.00, desc: 'Plano de dados adicional — Mai',     proj: null,   status: 'DRAFT',     rev: null, note: null },
    { emp: 'demo_emp_sofia', d: dt(2026,5,19), cat: 'Transporte',            amount: 22.00, desc: 'Uber para cliente JM — Cascais',     proj: 'jm',   status: 'SUBMITTED', rev: null, note: null },
    { emp: 'demo_emp_rui',   d: dt(2026,5,20), cat: 'Telecomunicações',      amount: 25.00, desc: 'Plano de dados adicional — Mai',     proj: null,   status: 'DRAFT',     rev: null, note: null },
  ]

  for (const def of EXP_DEFS) {
    const empId      = empMap[def.emp]
    const projectId  = def.proj  ? projMap[def.proj]  : null
    const reviewerId = def.rev   ? empMap[def.rev]    : null
    const existing   = await db.expense.findFirst({
      where: { employeeId: empId, date: def.d, category: def.cat, amount: dec(def.amount) },
    })
    if (existing) continue

    const submittedAt = def.status !== 'DRAFT' ? new Date(def.d.getTime() + 86400000) : null
    const reviewedAt  = (def.status === 'APPROVED' || def.status === 'REJECTED')
      ? new Date(def.d.getTime() + 3 * 86400000) : null

    await db.expense.create({
      data: {
        employeeId: empId, projectId,
        date: def.d, category: def.cat, amount: dec(def.amount),
        description: def.desc, status: def.status,
        submittedAt, reviewedBy: reviewerId, reviewNote: def.note,
        reviewedAt, updatedAt: new Date(),
      },
    })
  }

  // ── 11. Skills catalogue ─────────────────────────────────────────────────
  console.log('  [11/14] Skills catalogue…')

  const SKILL_DEFS = [
    { name: 'Node.js',            cat: 'Backend'    },
    { name: 'Python',             cat: 'Backend'    },
    { name: 'Java / Spring Boot', cat: 'Backend'    },
    { name: '.NET / C#',          cat: 'Backend'    },
    { name: 'REST APIs',          cat: 'Backend'    },
    { name: 'GraphQL',            cat: 'Backend'    },
    { name: 'React',              cat: 'Frontend'   },
    { name: 'Next.js',            cat: 'Frontend'   },
    { name: 'TypeScript',         cat: 'Frontend'   },
    { name: 'Angular',            cat: 'Frontend'   },
    { name: 'React Native',       cat: 'Mobile'     },
    { name: 'Flutter',            cat: 'Mobile'     },
    { name: 'PostgreSQL',         cat: 'Dados'      },
    { name: 'MongoDB',            cat: 'Dados'      },
    { name: 'Redis',              cat: 'Dados'      },
    { name: 'Power BI',           cat: 'Dados'      },
    { name: 'Elasticsearch',      cat: 'Dados'      },
    { name: 'AWS',                cat: 'Cloud'      },
    { name: 'Azure',              cat: 'Cloud'      },
    { name: 'Docker',             cat: 'Cloud'      },
    { name: 'Kubernetes',         cat: 'Cloud'      },
    { name: 'Terraform',          cat: 'Cloud'      },
    { name: 'CI/CD (GitHub Actions)', cat: 'Cloud'  },
    { name: 'Figma',              cat: 'Design'     },
    { name: 'UX Research',        cat: 'Design'     },
    { name: 'Design Systems',     cat: 'Design'     },
    { name: 'Scrum / Agile',      cat: 'Gestão'     },
    { name: 'PMP',                cat: 'Gestão'     },
    { name: 'Risk Management',    cat: 'Gestão'     },
    { name: 'OAuth / OIDC',       cat: 'Segurança'  },
    { name: 'Cibersegurança',     cat: 'Segurança'  },
  ]

  const skillMap: Record<string, string> = {}
  for (const s of SKILL_DEFS) {
    const rec = await db.skill.upsert({
      where: { name: s.name }, update: { category: s.cat }, create: { name: s.name, category: s.cat },
    })
    skillMap[s.name] = rec.id
  }

  // ── 12. Employee skills ───────────────────────────────────────────────────
  console.log('  [12/14] Employee skills…')

  // level: 1=Básico 2=Elementar 3=Intermédio 4=Avançado 5=Expert
  const EMP_SKILLS = [
    // Ana — Tech Lead, fullstack + cloud
    ['demo_emp_ana', 'Node.js',            5],
    ['demo_emp_ana', 'TypeScript',         5],
    ['demo_emp_ana', 'React',              4],
    ['demo_emp_ana', 'Next.js',            4],
    ['demo_emp_ana', 'REST APIs',          5],
    ['demo_emp_ana', 'PostgreSQL',         4],
    ['demo_emp_ana', 'Docker',             4],
    ['demo_emp_ana', 'AWS',                3],
    ['demo_emp_ana', 'Scrum / Agile',      5],
    ['demo_emp_ana', 'OAuth / OIDC',       3],
    // João — Backend Developer
    ['demo_emp_joao', 'Node.js',           4],
    ['demo_emp_joao', 'TypeScript',        4],
    ['demo_emp_joao', 'REST APIs',         4],
    ['demo_emp_joao', 'GraphQL',           3],
    ['demo_emp_joao', 'PostgreSQL',        3],
    ['demo_emp_joao', 'Redis',             2],
    ['demo_emp_joao', 'Docker',            3],
    ['demo_emp_joao', 'Scrum / Agile',     3],
    // Pedro — Senior Developer, cloud-focused
    ['demo_emp_pedro', 'Java / Spring Boot', 5],
    ['demo_emp_pedro', 'Python',           4],
    ['demo_emp_pedro', 'AWS',              5],
    ['demo_emp_pedro', 'Kubernetes',       4],
    ['demo_emp_pedro', 'Docker',           5],
    ['demo_emp_pedro', 'Terraform',        4],
    ['demo_emp_pedro', 'CI/CD (GitHub Actions)', 4],
    ['demo_emp_pedro', 'PostgreSQL',       3],
    ['demo_emp_pedro', 'Cibersegurança',   3],
    // Mariana — UX/UI Designer
    ['demo_emp_mari', 'Figma',             5],
    ['demo_emp_mari', 'UX Research',       4],
    ['demo_emp_mari', 'Design Systems',    4],
    ['demo_emp_mari', 'React',             2],
    ['demo_emp_mari', 'Scrum / Agile',     3],
    // Sofia — Project Manager
    ['demo_emp_sofia', 'Scrum / Agile',    5],
    ['demo_emp_sofia', 'PMP',              4],
    ['demo_emp_sofia', 'Risk Management',  4],
    ['demo_emp_sofia', 'Power BI',         3],
    // Rui — Admin
    ['demo_emp_rui', 'Power BI',           2],
    ['demo_emp_rui', 'Scrum / Agile',      2],
  ] as const

  for (const [clerkKey, skillName, level] of EMP_SKILLS) {
    const empId   = empMap[clerkKey]
    const skillId = skillMap[skillName]
    if (!skillId) continue
    await db.employeeSkill.upsert({
      where:  { employeeId_skillId: { employeeId: empId, skillId } },
      update: { level },
      create: { employeeId: empId, skillId, level },
    })
  }

  // ── 13. Project skill requirements ────────────────────────────────────────
  console.log('  [13/14] Project skill requirements…')

  const PROJ_SKILLS = [
    // PAG — banking-grade, security critical
    ['pag', 'Node.js',           4, true ],
    ['pag', 'TypeScript',        4, true ],
    ['pag', 'REST APIs',         4, true ],
    ['pag', 'PostgreSQL',        3, true ],
    ['pag', 'OAuth / OIDC',      3, true ],
    ['pag', 'Cibersegurança',    3, false],
    ['pag', 'Docker',            3, false],
    // APP — mobile + backend
    ['app', 'React Native',      3, true ],
    ['app', 'TypeScript',        3, true ],
    ['app', 'REST APIs',         3, true ],
    ['app', 'Figma',             2, false],
    // NOS — Java-heavy, cloud-native
    ['nos', 'Java / Spring Boot',4, true ],
    ['nos', 'AWS',               3, true ],
    ['nos', 'Docker',            3, true ],
    ['nos', 'Kubernetes',        3, false],
    ['nos', 'PostgreSQL',        2, false],
    // EDP — data viz + design
    ['edp', 'React',             3, true ],
    ['edp', 'TypeScript',        3, true ],
    ['edp', 'Figma',             3, true ],
    ['edp', 'Power BI',          2, false],
    // JM — Python + data
    ['jm',  'Python',            3, true ],
    ['jm',  'PostgreSQL',        3, true ],
    ['jm',  'REST APIs',         2, false],
    ['jm',  'Scrum / Agile',     3, false],
  ] as const

  for (const [projKey, skillName, minLevel, required] of PROJ_SKILLS) {
    const projId  = projMap[projKey]
    const skillId = skillMap[skillName]
    if (!skillId) continue
    await db.projectSkill.upsert({
      where:  { projectId_skillId: { projectId: projId, skillId } },
      update: { minLevel, required },
      create: { projectId: projId, skillId, minLevel, required },
    })
  }

  // ── 14. Operational targets (Jan–Dec 2026) ────────────────────────────────
  console.log('  [14/14] Operational targets…')

  // Revenue ramps up as new clients onboard; margin target stays steady
  const TARGET_DEFS = [
    { m: 1,  y: 2026, rev:  75_000, margin: 30, util: 78 },  // Jan — 2 clients
    { m: 2,  y: 2026, rev:  88_000, margin: 33, util: 80 },  // Feb — EDP joins
    { m: 3,  y: 2026, rev: 100_000, margin: 35, util: 82 },  // Mar — JM joins
    { m: 4,  y: 2026, rev: 100_000, margin: 35, util: 82 },
    { m: 5,  y: 2026, rev: 100_000, margin: 35, util: 82 },
    { m: 6,  y: 2026, rev: 105_000, margin: 36, util: 83 },
    { m: 7,  y: 2026, rev: 105_000, margin: 36, util: 83 },
    { m: 8,  y: 2026, rev: 105_000, margin: 36, util: 83 },
    { m: 9,  y: 2026, rev: 110_000, margin: 37, util: 85 },  // growth target H2
    { m: 10, y: 2026, rev: 110_000, margin: 37, util: 85 },
    { m: 11, y: 2026, rev: 110_000, margin: 37, util: 85 },
    { m: 12, y: 2026, rev: 115_000, margin: 38, util: 85 },  // year-end push
  ]

  for (const t of TARGET_DEFS) {
    await db.operationalTarget.upsert({
      where:  { month_year: { month: t.m, year: t.y } },
      update: { revenueTarget: dec(t.rev), marginTarget: dec(t.margin), utilizationTarget: dec(t.util) },
      create: { month: t.m, year: t.y, revenueTarget: dec(t.rev), marginTarget: dec(t.margin), utilizationTarget: dec(t.util) },
    })
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n✅  Seed concluído!\n')
  console.log('  Period    : Jan 2026 – 22 May 2026')
  console.log(`  Employees : ${EMPLOYEES.length}  (${EMPLOYEES.filter(e=>e.role==='MANAGER').length} manager + ${EMPLOYEES.filter(e=>e.role==='EMPLOYEE').length} employee)`)
  console.log(`  Projects  : ${PROJECT_DEFS.filter(p=>p.active).length} active + ${PROJECT_DEFS.filter(p=>!p.active).length} inactive`)
  console.log(`  Timesheets: ${tsCount}  (Jan–Apr APPROVED, May SUBMITTED)`)
  console.log(`  Invoices  : ${invSeq - 1}  (Jan–Apr PAID, May SENT)`)
  console.log(`  Expenses  : ${EXP_DEFS.length}  (mix of APPROVED/SUBMITTED/DRAFT/REJECTED)`)
  console.log(`  Skills    : ${SKILL_DEFS.length} catalogue · ${EMP_SKILLS.length} employee · ${PROJ_SKILLS.length} project`)
  console.log(`  Targets   : ${TARGET_DEFS.length} monthly targets (Jan–Dec 2026)`)
  console.log()
  console.log('  Revenue snapshot (ex-VAT):')
  console.log('    Jan  €72 000  (MBCP + NOS)')
  console.log('    Feb  €88 000  (+ EDP onboards)')
  console.log('    Mar  €98 000  (+ JM onboards)')
  console.log('    Apr  €98 000')
  console.log('    May  €98 000  (invoices SENT — not yet paid)')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
