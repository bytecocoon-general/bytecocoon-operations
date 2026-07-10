'use client'

import { useEffect, useState } from 'react'
import {
  Euro, TrendingUp, TrendingDown, AlertTriangle, Clock,
  CheckCircle, XCircle, Activity, Target, Zap, ChevronRight,
  BarChart3,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

type HeatStatus = 'OK' | 'ATTENTION' | 'CRITICAL'

interface DashboardStats {
  revenueMtd: number; revenueLastMonth: number; revenueTarget: number | null; revenueYtd: number
  marginMtd: number; marginLast: number; marginTarget: number | null
  utilizationMtd: number; utilizationLast: number; utilizationTarget: number | null
  unallocatedHours: number; billableHours: number; availableHours: number
  activeEmployees: number; pendingApprovals: number; pendingExpenses: number
  projectsAtRisk: number; projectsTotal: number
  forecast90Base: number; forecast90Best: number; forecast90Worst: number; forecastBaseProbability: number
  sparkRevenue: Array<{ month: number; year: number; revenue: number }>
  heatmap: Record<string, HeatStatus>
  staffingRadar: { available: number; underallocated: number; wellAllocated: number; overallocated: number; burnoutRisk: number }
  staffingSuggestions: Array<{ id: string; name: string; skills: string[]; fitsProjects: number; status: string; availableIn: number | null }>
  timesheetAdherence: number; adherenceDelta: number
  projectsWithoutTimesheet: number; internalHoursPercent: number
  operationalAlerts: Array<{ title: string; subtitle: string; impact: number; severity: string; trend: string }>
  priorityAlerts: Array<{ project: string; client: string; risk: string; probability: number; impact: number; cause: string; action: string; severity: string }>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: number, decimals = 2) {
  return v.toLocaleString('pt-PT', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}
function fmtK(v: number) {
  if (v >= 1_000_000) return `€${fmt(v / 1_000_000, 1)}M`
  if (v >= 1_000)     return `€${fmt(v / 1_000, 0)}k`
  return `€${fmt(v, 0)}`
}
function delta(curr: number, prev: number) {
  if (!prev) return null
  return ((curr - prev) / prev) * 100
}

const HEAT_COLOR: Record<HeatStatus, string> = {
  OK:        'text-emerald-400 bg-emerald-950/60 border-emerald-800/40',
  ATTENTION: 'text-amber-400  bg-amber-950/60  border-amber-800/40',
  CRITICAL:  'text-red-400    bg-red-950/60    border-red-800/40',
}
const HEAT_LABEL: Record<HeatStatus, string> = { OK: 'OK', ATTENTION: 'Atenção', CRITICAL: 'Crítico' }
const HEAT_DOT: Record<HeatStatus, string>   = { OK: 'bg-emerald-400', ATTENTION: 'bg-amber-400', CRITICAL: 'bg-red-500' }

const SEV_COLOR: Record<string, string> = {
  CRITICAL: 'text-red-400 bg-red-950/50 border-red-800/40',
  HIGH:     'text-amber-400 bg-amber-950/50 border-amber-800/40',
  MEDIUM:   'text-blue-400 bg-blue-950/50 border-blue-800/40',
}

const RADAR_COLORS = ['#34d399', '#f59e0b', '#60a5fa', '#f87171', '#a78bfa']

const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, deltaVal, target, icon: Icon, tone, sparkData,
}: {
  label: string; value: string; sub?: string; deltaVal?: number | null
  target?: number | null; icon: React.ElementType; tone: string; sparkData?: number[]
}) {
  const toneMap: Record<string, string> = {
    emerald: 'bg-emerald-950/60 border-emerald-800/30 text-emerald-400',
    violet:  'bg-violet-950/60  border-violet-800/30  text-violet-400',
    blue:    'bg-blue-950/60    border-blue-800/30    text-blue-400',
    amber:   'bg-amber-950/60   border-amber-800/30   text-amber-400',
    red:     'bg-red-950/60     border-red-800/30     text-red-400',
    orange:  'bg-orange-950/60  border-orange-800/30  text-orange-400',
  }

  const sparkPoints = sparkData?.map((v, i) => ({ i, v })) ?? []

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2 hover:border-violet-500/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className={`p-1.5 rounded-lg border ${toneMap[tone] ?? toneMap.violet}`}>
          <Icon size={14} />
        </div>
        {deltaVal != null && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 ${deltaVal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {deltaVal >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {deltaVal >= 0 ? '+' : ''}{fmt(deltaVal, 1)}%
          </span>
        )}
      </div>

      <div>
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>}
      </div>

      {target != null && target > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>vs target</span>
            <span>{fmt(Math.min((parseFloat(value.replace(/[^\d.]/g, '')) / target) * 100, 100), 0)}%</span>
          </div>
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full transition-all"
              style={{ width: `${Math.min((parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.')) / target) * 100, 100)}%` }} />
          </div>
        </div>
      )}

      {sparkPoints.length > 1 && (
        <div className="h-10 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkPoints}>
              <Line type="monotone" dataKey="v" stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function HeatTile({ label, status }: { label: string; status: HeatStatus }) {
  return (
    <div className={`rounded-xl border p-3 flex flex-col gap-2 ${HEAT_COLOR[status]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium opacity-80">{label}</span>
        <div className={`w-2 h-2 rounded-full ${HEAT_DOT[status]}`} />
      </div>
      <span className="text-sm font-bold">{HEAT_LABEL[status]}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminDashboard({ employeeName }: { employeeName: string }) {
  const [stats,   setStats]   = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const now    = new Date()
  const today  = now.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const month  = now.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-secondary rounded-lg" />
        <div className="grid grid-cols-3 gap-4">{[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-card border border-border rounded-xl" />
        ))}</div>
      </div>
    )
  }

  if (!stats) {
    return <div className="text-muted-foreground text-sm py-10 text-center">Erro ao carregar dados do dashboard.</div>
  }

  const {
    revenueMtd, revenueLastMonth, revenueTarget, revenueYtd,
    marginMtd, marginLast, marginTarget,
    utilizationMtd, utilizationLast, utilizationTarget,
    unallocatedHours, billableHours, availableHours,
    pendingApprovals, projectsAtRisk, projectsTotal,
    forecast90Base, forecast90Best, forecast90Worst,
    sparkRevenue, heatmap, staffingRadar, staffingSuggestions,
    timesheetAdherence, adherenceDelta, projectsWithoutTimesheet, internalHoursPercent,
    operationalAlerts, priorityAlerts,
  } = stats

  const sparkData      = sparkRevenue.map(s => s.revenue)
  const revDelta       = delta(revenueMtd, revenueLastMonth)
  const marginDelta    = marginLast ? marginMtd - marginLast : null
  const utilDelta      = delta(utilizationMtd, utilizationLast)

  const radarData = [
    { name: 'Disponíveis',   value: staffingRadar.available,      pct: '' },
    { name: 'Subalocados',   value: staffingRadar.underallocated, pct: '' },
    { name: 'Bem alocados',  value: staffingRadar.wellAllocated,  pct: '' },
    { name: 'Sobrealoc.',    value: staffingRadar.overallocated,  pct: '' },
    { name: 'Risco burnout', value: staffingRadar.burnoutRisk,    pct: '' },
  ]
  const totalRadar = radarData.reduce((s, r) => s + r.value, 0) || 1

  // Forecast chart data (last 6 months actual + 3 months projected)
  const forecastChart: Array<{ label: string; real?: number; base?: number; best?: number; worst?: number }> = [
    ...sparkRevenue.map(s => ({
      label: MONTH_NAMES[s.month - 1],
      real:  s.revenue || undefined,
    })),
    { label: MONTH_NAMES[(now.getMonth() + 1) % 12], base: forecast90Base / 3, best: forecast90Best / 3, worst: forecast90Worst / 3 },
    { label: MONTH_NAMES[(now.getMonth() + 2) % 12], base: forecast90Base / 3, best: forecast90Best / 3, worst: forecast90Worst / 3 },
    { label: MONTH_NAMES[(now.getMonth() + 3) % 12], base: forecast90Base / 3, best: forecast90Best / 3, worst: forecast90Worst / 3 },
  ]

  return (
    <div className="space-y-6">

      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bom dia, {employeeName.split(' ')[0]}! 👋</h1>
          <p className="text-sm text-muted-foreground mt-1">Aqui está o estado da sua operação hoje.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground border border-border rounded-lg px-3 py-1.5">
          <Clock size={13} />
          <span className="capitalize">{today}</span>
        </div>
      </div>

      {/* ── Alertas de acção pendente ─────────────────────────────────────── */}
      {(pendingApprovals > 0 || stats.pendingExpenses > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pendingApprovals > 0 && (
            <Link href="/dashboard/approvals"
              className="flex items-center gap-3 px-5 py-4 bg-amber-950/30 border border-amber-800/30 rounded-xl hover:bg-amber-950/50 transition-colors group">
              <Clock size={16} className="text-amber-500 shrink-0" />
              <p className="text-sm text-amber-300 flex-1">
                <strong>{pendingApprovals} timesheet{pendingApprovals !== 1 ? 's' : ''}</strong> a aguardar aprovação
              </p>
              <ChevronRight size={14} className="text-amber-600 group-hover:text-amber-400 transition-colors" />
            </Link>
          )}
          {stats.pendingExpenses > 0 && (
            <Link href="/dashboard/expenses"
              className="flex items-center gap-3 px-5 py-4 bg-orange-950/30 border border-orange-800/30 rounded-xl hover:bg-orange-950/50 transition-colors group">
              <XCircle size={16} className="text-orange-500 shrink-0" />
              <p className="text-sm text-orange-300 flex-1">
                <strong>{fmtK(stats.pendingExpenses)}</strong> em despesas pendentes de aprovação
              </p>
              <ChevronRight size={14} className="text-orange-600 group-hover:text-orange-400 transition-colors" />
            </Link>
          )}
        </div>
      )}

      {/* ── Resumo Executivo — 6 KPI cards ───────────────────────────────── */}
      <section className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Resumo Executivo</p>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <KpiCard
            label={`Revenue (${month})`} value={fmtK(revenueMtd)}
            sub={revenueYtd > 0 ? `YTD ${fmtK(revenueYtd)}` : undefined}
            deltaVal={revDelta} target={revenueTarget}
            icon={Euro} tone="emerald" sparkData={sparkData}
          />
          <KpiCard
            label="Margem Real" value={`${fmt(marginMtd, 1)}%`}
            sub={marginTarget ? `Target ${fmt(marginTarget, 0)}%` : undefined}
            deltaVal={marginDelta}
            icon={TrendingUp} tone="violet"
          />
          <KpiCard
            label="Utilização (Billable)" value={`${fmt(utilizationMtd, 1)}%`}
            sub={`${Math.round(billableHours)}h de ${Math.round(availableHours)}h disponíveis`}
            deltaVal={utilDelta} target={utilizationTarget}
            icon={Activity} tone="blue"
          />
          <KpiCard
            label="Horas Não Alocadas" value={`${Math.round(unallocatedHours)}h`}
            sub={`${internalHoursPercent}% do total disponível`}
            icon={Target} tone="amber"
          />
          <KpiCard
            label="Projectos em Risco" value={`${projectsAtRisk}`}
            sub={`de ${projectsTotal} activos`}
            icon={AlertTriangle} tone={projectsAtRisk > 0 ? 'red' : 'emerald'}
          />
          <KpiCard
            label="Forecast (90 dias)" value={fmtK(forecast90Base)}
            sub={`Melhor: ${fmtK(forecast90Best)}`}
            icon={BarChart3} tone="orange"
          />
        </div>
      </section>

      {/* ── Row: Heatmap + Staffing Radar + Sugestões ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Heatmap */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Heatmap da Operação</p>
          <div className="grid grid-cols-2 gap-2">
            <HeatTile label="Delivery"   status={heatmap.delivery   as HeatStatus} />
            <HeatTile label="Staffing"   status={heatmap.staffing   as HeatStatus} />
            <HeatTile label="Financeiro" status={heatmap.financeiro as HeatStatus} />
            <HeatTile label="Clientes"   status={heatmap.clientes   as HeatStatus} />
            <HeatTile label="Projectos"  status={heatmap.projectos  as HeatStatus} />
            <HeatTile label="Qualidade"  status={heatmap.qualidade  as HeatStatus} />
          </div>
          <Link href="/dashboard/reports" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 mt-1">
            Ver análise completa <ChevronRight size={12} />
          </Link>
        </div>

        {/* Staffing Radar */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Staffing Radar</p>
          <div className="flex items-center gap-4">
            <div className="h-36 w-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={radarData} cx="50%" cy="50%" innerRadius={38} outerRadius={60}
                    dataKey="value" paddingAngle={2}>
                    {radarData.map((_, i) => (
                      <Cell key={i} fill={RADAR_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => { const n = v as number; return [`${n} (${Math.round((n / totalRadar) * 100)}%)`, ''] }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5">
              {radarData.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: RADAR_COLORS[i] }} />
                  <span className="text-xs text-muted-foreground flex-1 truncate">{r.name}</span>
                  <span className="text-xs font-semibold text-foreground">{r.value}</span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {Math.round((r.value / totalRadar) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
          <Link href="/dashboard/staffing" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
            Ver staffing completo <ChevronRight size={12} />
          </Link>
        </div>

        {/* Sugestões Inteligentes */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap size={13} className="text-amber-400" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Sugestões Inteligentes</p>
          </div>

          {staffingSuggestions.length === 0 ? (
            <div className="flex items-center gap-2 py-4">
              <CheckCircle size={16} className="text-emerald-400" />
              <p className="text-sm text-muted-foreground">Todos os colaboradores estão bem alocados.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {staffingSuggestions.map((s, i) => (
                <div key={i} className="border-b border-border pb-3 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-violet-600/20 border border-violet-500/20 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-violet-400">
                            {s.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{s.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {s.status} · encaixa em {s.fitsProjects} {s.fitsProjects === 1 ? 'projecto' : 'projectos'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground shrink-0 mt-1" />
                  </div>
                  {s.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 pl-9">
                      {s.skills.slice(0, 4).map((sk, j) => (
                        <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row: Timesheets Signal + Priority Alerts ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Timesheets — Sinal Operacional */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Timesheets — Sinal Operacional</p>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">Aderência esta semana</p>
              <p className={`text-2xl font-bold ${timesheetAdherence >= 80 ? 'text-emerald-400' : timesheetAdherence >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                {timesheetAdherence}%
              </p>
              {adherenceDelta !== 0 && (
                <p className={`text-[10px] flex items-center gap-0.5 ${adherenceDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {adherenceDelta >= 0 ? '↑' : '↓'} {Math.abs(adherenceDelta)}pp vs mês ant.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">Projectos sem TS</p>
              <p className={`text-2xl font-bold ${projectsWithoutTimesheet > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {projectsWithoutTimesheet}
              </p>
              <p className="text-[10px] text-muted-foreground">activos</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">Horas internas</p>
              <p className={`text-2xl font-bold ${internalHoursPercent > 30 ? 'text-amber-400' : 'text-foreground'}`}>
                {internalHoursPercent}%
              </p>
              <p className="text-[10px] text-muted-foreground">do total disponível</p>
            </div>
          </div>

          {/* Operational alerts */}
          {operationalAlerts.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">Alertas Operacionais</p>
              {operationalAlerts.map((alert, i) => (
                <div key={i} className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 ${SEV_COLOR[alert.severity]}`}>
                  <div className="flex items-start gap-2 min-w-0">
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{alert.title}</p>
                      <p className="text-[10px] opacity-70 truncate">{alert.subtitle}</p>
                    </div>
                  </div>
                  {alert.impact > 0 && (
                    <span className="text-xs font-semibold shrink-0">-{fmtK(alert.impact)}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <Link href="/dashboard/approvals" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
            Ver timesheets <ChevronRight size={12} />
          </Link>
        </div>

        {/* Priority Alerts */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Alertas Prioritários</p>
            {priorityAlerts.length > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800/30">
                {priorityAlerts.length}
              </span>
            )}
          </div>

          {priorityAlerts.length === 0 ? (
            <div className="flex items-center gap-2 py-6 text-emerald-400">
              <CheckCircle size={16} />
              <p className="text-sm">Sem alertas prioritários activos.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {priorityAlerts.map((alert, i) => (
                <div key={i} className={`rounded-lg border p-3 space-y-2 ${SEV_COLOR[alert.severity]}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-1.5 h-full min-h-[1.5rem] rounded-full shrink-0 ${alert.severity === 'CRITICAL' ? 'bg-red-500' : alert.severity === 'HIGH' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{alert.project}</p>
                        <p className="text-[10px] opacity-70 truncate">{alert.risk}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold">{alert.probability}%</p>
                      <p className="text-[10px] opacity-60">prob.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div>
                      <p className="opacity-50">Impacto</p>
                      <p className="font-medium">{alert.impact > 0 ? fmtK(alert.impact) : '—'}</p>
                    </div>
                    <div>
                      <p className="opacity-50">Causa</p>
                      <p className="font-medium truncate">{alert.cause}</p>
                    </div>
                    <div>
                      <p className="opacity-50">Acção</p>
                      <p className="font-medium truncate">{alert.action}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Forecast — próximos 90 dias ────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Forecast — Próximos 90 dias</p>
          <div className="grid grid-cols-3 gap-3 text-right">
            {[
              { label: 'Melhor cenário', value: fmtK(forecast90Best),  color: 'text-emerald-400', prob: '30%' },
              { label: 'Cenário base',   value: fmtK(forecast90Base),  color: 'text-violet-400',  prob: '50%' },
              { label: 'Pior cenário',   value: fmtK(forecast90Worst), color: 'text-red-400',     prob: '20%' },
            ].map((s, i) => (
              <div key={i}>
                <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                <p className="text-[10px] text-muted-foreground/60">Prob. {s.prob}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecastChart} margin={{ top: 5, right: 10, bottom: 0, left: 10 }}>
              <defs>
                <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"   stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%"  stopColor="#8b5cf6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? `€${Math.round(v / 1000)}k` : `€${v}`} />
              <Tooltip
                contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }}
                formatter={(v, name) => [fmtK(v as number), name as string]}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Area type="monotone" dataKey="real"  name="Real"          stroke="#8b5cf6" fill="url(#gradReal)" strokeWidth={2} dot={{ r: 2, fill: '#8b5cf6' }} connectNulls />
              <Line  type="monotone" dataKey="best"  name="Melhor"        stroke="#34d399" strokeWidth={1.5} strokeDasharray="4 2" dot={false} connectNulls />
              <Line  type="monotone" dataKey="base"  name="Base"          stroke="#60a5fa" strokeWidth={1.5} strokeDasharray="4 2" dot={false} connectNulls />
              <Line  type="monotone" dataKey="worst" name="Pior"          stroke="#f87171" strokeWidth={1.5} strokeDasharray="4 2" dot={false} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}
