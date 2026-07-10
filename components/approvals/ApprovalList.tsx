'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Eye, Clock, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { Button }      from '@/components/ui/button'
import { Textarea }    from '@/components/ui/textarea'
import { FormMessage } from '@/components/ui/form-message'
import { StatusBadge } from '@/components/ui/badge'
import { cn }          from '@/lib/utils'

interface ProjectMembership { projectId: string; overtimeAllowed: boolean }
interface Employee { name: string; email: string; department: { name: string }; projectMemberships: ProjectMembership[] }
interface TimesheetLine { date: string; type: string; hours: number; extraHours: number; description: string | null; project?: { name: string } | null; projectId?: string | null }

interface Timesheet {
  id:          string
  month:       number
  year:        number
  status:      string
  submittedAt: string | null
  reviewNote:  string | null
  employee:    Employee
  lines:       TimesheetLine[]
  expenses:    unknown[]
}

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: 'Submetida', APPROVED: 'Aprovada', REJECTED: 'Rejeitada', DRAFT: 'Rascunho',
}

const LINE_TYPE_LABEL: Record<string, string> = {
  WORK: 'Trabalho', VACATION: 'Férias', SICK_LEAVE: 'Baixa', PUBLIC_HOLIDAY: 'Feriado', OTHER_ABSENCE: 'Ausência',
}

interface Props {
  onCountChange?: (count: number) => void
}

export default function ApprovalList({ onCountChange }: Props) {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [filter,     setFilter]     = useState<string>('SUBMITTED')
  const [loading,    setLoading]    = useState(true)
  const [expanded,   setExpanded]   = useState<string | null>(null)
  const [rejectId,   setRejectId]   = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [saving,     setSaving]     = useState(false)
  const [message,    setMessage]    = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function showMessage(type: 'success' | 'error', text: string) { setMessage({ type, text }); setTimeout(() => setMessage(null), 3000) }

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/timesheets?status=${filter}`)
      .then(r => r.json())
      .then(data => {
        setTimesheets(data)
        setLoading(false)
        if (filter === 'SUBMITTED') onCountChange?.(data.length)
      })
  }, [filter, onCountChange])

  async function handleAction(timesheetId: string, action: 'APPROVED' | 'REJECTED', note?: string) {
    setSaving(true)
    try {
      const res = await fetch('/api/timesheets/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timesheetId, action, note }) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      showMessage('success', action === 'APPROVED' ? 'Timesheet aprovada!' : 'Timesheet rejeitada.')
      setTimesheets(prev => {
        const next = prev.filter(t => t.id !== timesheetId)
        if (filter === 'SUBMITTED') onCountChange?.(next.length)
        return next
      })
      setRejectId(null); setRejectNote('')
    } catch (e: unknown) {
      showMessage('error', (e as Error).message ?? 'Erro ao processar.')
    } finally {
      setSaving(false)
    }
  }

  const totalHours = (ts: Timesheet) => ts.lines.reduce((sum, l) => sum + Number(l.hours) + Number(l.extraHours), 0)

  interface OvertimeWarning { projectName: string; totalExtra: number; dates: string[] }

  /** Returns per-project overtime warnings (only for projects where overtimeAllowed = false). */
  function overtimeWarnings(ts: Timesheet): OvertimeWarning[] {
    const allowed   = new Set(ts.employee.projectMemberships.filter(m => m.overtimeAllowed).map(m => m.projectId))
    const byProject = new Map<string, OvertimeWarning>()
    for (const line of ts.lines) {
      const extra = Number(line.extraHours)
      if (extra > 0 && line.projectId && !allowed.has(line.projectId)) {
        if (!byProject.has(line.projectId)) {
          byProject.set(line.projectId, { projectName: line.project?.name ?? line.projectId, totalExtra: 0, dates: [] })
        }
        const w = byProject.get(line.projectId)!
        w.totalExtra += extra
        w.dates.push(new Date(line.date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }))
      }
    }
    return Array.from(byProject.values())
  }

  /** Set of projectIds where overtime is NOT allowed — used to highlight table rows. */
  function unauthorisedProjectIds(ts: Timesheet): Set<string> {
    const allowed = new Set(ts.employee.projectMemberships.filter(m => m.overtimeAllowed).map(m => m.projectId))
    return new Set(
      ts.lines
        .filter(l => Number(l.extraHours) > 0 && l.projectId && !allowed.has(l.projectId))
        .map(l => l.projectId!)
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-2">
        {(['SUBMITTED', 'APPROVED', 'REJECTED'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
              filter === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary border-border text-zinc-400 hover:bg-secondary/80 hover:text-zinc-200'
            )}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Mensagem */}
      {message && <FormMessage type={message.type}>{message.text}</FormMessage>}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-20 text-zinc-600">A carregar...</div>
      ) : timesheets.length === 0 ? (
        <div className="bg-card rounded-xl border border-border px-6 py-16 text-center">
          <Clock size={36} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">Não há timesheets {STATUS_LABEL[filter].toLowerCase()}s.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {timesheets.map(ts => (
            <div key={ts.id} className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Cabeçalho */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-semibold text-zinc-100">{ts.employee.name}</p>
                    <p className="text-xs text-zinc-500">{ts.employee.department.name} · {ts.employee.email}</p>
                  </div>
                  <div className="text-sm text-zinc-300 font-medium capitalize">
                    {new Date(ts.year, ts.month - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
                  </div>
                  <StatusBadge status={ts.status} label={STATUS_LABEL[ts.status]} />
                  <span className="text-xs text-zinc-500">{totalHours(ts)}h total</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => setExpanded(expanded === ts.id ? null : ts.id)}
                    className="text-xs text-zinc-500"
                  >
                    <Eye size={14} />
                    {expanded === ts.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </Button>

                  {ts.status === 'SUBMITTED' && (
                    <>
                      <button
                        onClick={() => handleAction(ts.id, 'APPROVED')}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950 text-emerald-400 border border-emerald-800/30 text-xs rounded-lg hover:bg-emerald-900 disabled:opacity-40 transition-colors"
                      >
                        <CheckCircle size={14} /> Aprovar
                      </button>
                      <button
                        onClick={() => setRejectId(ts.id)}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950 text-red-400 border border-red-800/30 text-xs rounded-lg hover:bg-red-900 disabled:opacity-40 transition-colors"
                      >
                        <XCircle size={14} /> Rejeitar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Overtime not authorised warning */}
              {(() => {
                const warnings = overtimeWarnings(ts)
                return warnings.length > 0 ? (
                  <div className="mx-5 mb-3 px-3 py-2.5 bg-amber-950/50 border border-amber-800/40 rounded-lg space-y-1.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                      <p className="text-xs font-semibold text-amber-300">
                        Horas extra não autorizadas — ver linhas destacadas abaixo
                      </p>
                    </div>
                    <ul className="space-y-0.5 pl-5">
                      {warnings.map((w, i) => (
                        <li key={i} className="text-xs text-amber-300/80">
                          <strong className="text-amber-300">{w.projectName}</strong>
                          {' — '}<strong>{w.totalExtra}h extra</strong>
                          {' nos dias: '}{w.dates.join(', ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null
              })()}

              {/* Nota de rejeição existente */}
              {ts.reviewNote && (
                <div className="px-5 pb-3">
                  <p className="text-xs text-red-400 bg-red-950/50 border border-red-800/30 px-3 py-2 rounded-lg">
                    <strong>Nota:</strong> {ts.reviewNote}
                  </p>
                </div>
              )}

              {/* Inline rejection form */}
              {rejectId === ts.id && (
                <div className="px-5 pb-4 border-t border-border pt-3">
                  <p className="text-sm font-medium text-zinc-300 mb-2">Motivo da rejeição (obrigatório):</p>
                  <Textarea
                    value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)}
                    placeholder="Descreve o motivo da rejeição..."
                    rows={3}
                    className="focus:ring-red-500/30"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleAction(ts.id, 'REJECTED', rejectNote)}
                      disabled={saving || !rejectNote.trim()}
                      className="px-4 py-2 bg-red-950 text-red-400 border border-red-800/30 text-sm rounded-lg hover:bg-red-900 disabled:opacity-40 transition-colors"
                    >
                      Confirmar Rejeição
                    </button>
                    <Button variant="outline" onClick={() => { setRejectId(null); setRejectNote('') }}>Cancelar</Button>
                  </div>
                </div>
              )}

              {/* Detalhe das linhas */}
              {expanded === ts.id && (
                <div className="border-t border-border">
                  {(() => {
                    const badProjects = unauthorisedProjectIds(ts)
                    return (
                      <table className="w-full text-xs">
                        <thead className="bg-secondary/30">
                          <tr>
                            <th className="text-left px-5 py-2 text-zinc-500 font-medium uppercase tracking-wide">Data</th>
                            <th className="text-left px-3 py-2 text-zinc-500 font-medium uppercase tracking-wide">Tipo</th>
                            <th className="text-left px-3 py-2 text-zinc-500 font-medium uppercase tracking-wide">Projecto</th>
                            <th className="text-right px-3 py-2 text-zinc-500 font-medium uppercase tracking-wide">Horas</th>
                            <th className="text-right px-5 py-2 text-zinc-500 font-medium uppercase tracking-wide">Extra</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {ts.lines.map((line, i) => {
                            const hasUnauthorisedExtra = Number(line.extraHours) > 0 && line.projectId && badProjects.has(line.projectId)
                            return (
                              <tr key={i} className={hasUnauthorisedExtra ? 'bg-amber-950/25' : 'hover:bg-secondary/20 transition-colors'}>
                                <td className={`px-5 py-2 font-medium ${hasUnauthorisedExtra ? 'text-amber-200' : 'text-zinc-300'}`}>
                                  {new Date(line.date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                                </td>
                                <td className="px-3 py-2 text-zinc-400">{LINE_TYPE_LABEL[line.type] ?? line.type}</td>
                                <td className="px-3 py-2 text-zinc-400">{line.project?.name ?? '—'}</td>
                                <td className="px-3 py-2 text-right text-zinc-300 font-medium">{line.hours}h</td>
                                <td className={`px-5 py-2 text-right font-semibold ${hasUnauthorisedExtra ? 'text-amber-400' : 'text-zinc-600'}`}>
                                  {Number(line.extraHours) > 0 ? `${line.extraHours}h` : '—'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot className="bg-secondary/20">
                          <tr>
                            <td colSpan={3} className="px-5 py-2 text-zinc-500 font-medium">Total</td>
                            <td colSpan={2} className="px-5 py-2 text-right font-bold text-zinc-100">{totalHours(ts)}h</td>
                          </tr>
                        </tfoot>
                      </table>
                    )
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
