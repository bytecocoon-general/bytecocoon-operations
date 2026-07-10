import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { AlertCircle, Clock, CheckSquare, TrendingUp } from 'lucide-react'
import { KpiMiniCard } from '@/components/ui/kpi-card'
import { StatusBadge } from '@/components/ui/badge'
import AdminDashboard from '@/components/dashboard/AdminDashboard'
import Link from 'next/link'

export default async function DashboardPage() {
  const { userId } = await auth()

  const employee = await db.employee.findUnique({
    where:   { clerkId: userId! },
    include: {
      department: true,
      timesheets: { orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 6 },
    },
  })
  if (!employee) return null

  const isAdmin = employee.role === 'ADMIN' || employee.role === 'MANAGER'

  // ── Admin / Manager — full operational dashboard ───────────────────────────
  if (isAdmin) {
    return <AdminDashboard employeeName={employee.name} />
  }

  // ── Employee — personal timesheet overview ─────────────────────────────────
  const now         = new Date()
  const thisMonth   = employee.timesheets.find(t => t.month === now.getMonth() + 1 && t.year === now.getFullYear())
  const pendingOwn  = employee.timesheets.filter(t => t.status === 'SUBMITTED').length
  const monthLabel  = now.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })

  const STATUS_LABEL: Record<string, string> = {
    DRAFT: 'Rascunho', SUBMITTED: 'Submetida', APPROVED: 'Aprovada', REJECTED: 'Rejeitada',
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Olá, {employee.name.split(' ')[0]}!</h1>
        <p className="text-sm text-muted-foreground mt-1 capitalize">{employee.department.name} · {monthLabel}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiMiniCard
          tone="blue" icon={Clock} label="Timesheet este mês"
          value={thisMonth
            ? <StatusBadge status={thisMonth.status} label={STATUS_LABEL[thisMonth.status]} />
            : <span className="text-muted-foreground">Por preencher</span>
          }
        />
        <KpiMiniCard tone="amber" icon={CheckSquare} label="Aguarda aprovação" value={pendingOwn} />
        <KpiMiniCard tone="zinc"  icon={TrendingUp}  label="Total timesheets"  value={employee.timesheets.length} />
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Timesheets recentes</h2>
        </div>
        {employee.timesheets.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <AlertCircle size={32} className="text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">
              Ainda não tens timesheets. Clica em <strong className="text-foreground">Timesheet</strong> para começar.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {employee.timesheets.map(ts => (
              <div key={ts.id} className="px-6 py-3.5 flex items-center justify-between">
                <p className="text-sm font-medium text-foreground capitalize">
                  {new Date(ts.year, ts.month - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
                </p>
                <StatusBadge status={ts.status} label={STATUS_LABEL[ts.status]} />
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingOwn > 0 && (
        <div className="flex items-center gap-3 px-5 py-4 bg-amber-950/40 border border-amber-800/30 rounded-xl">
          <Clock size={16} className="text-amber-500 shrink-0" />
          <p className="text-sm text-amber-300">
            Tens <strong>{pendingOwn} timesheet{pendingOwn !== 1 ? 's' : ''}</strong> submetida{pendingOwn !== 1 ? 's' : ''} a aguardar revisão.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <Link href="/dashboard/timesheet"
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-xl transition-colors">
          <Clock size={15} /> Ir para Timesheet
        </Link>
        <Link href="/dashboard/expenses"
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-secondary hover:bg-secondary/80 text-foreground text-sm font-medium rounded-xl transition-colors border border-border">
          Ver Despesas
        </Link>
      </div>
    </div>
  )
}
