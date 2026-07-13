'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Send, ChevronLeft, ChevronRight, CalendarRange, X, AlertTriangle, FileSpreadsheet } from 'lucide-react'
import { Button }       from '@/components/ui/button'
import { Input }        from '@/components/ui/input'
import { SelectNative } from '@/components/ui/select-native'
import { FormMessage }  from '@/components/ui/form-message'
import { StatusBadge }  from '@/components/ui/badge'
import ImportTimesheetModal from './ImportTimesheetModal'
import TravelCompensationEditor, { MileageEntryInput, TravelPeriodInput } from './TravelCompensationEditor'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Project { id: string; name: string; client: { name: string } | null }

interface TimesheetLine {
  id?:                string
  date:               string
  projectId:          string | null
  type:               string
  hours:              number
  extraHours:         number
  overtimeMultiplier: number | null
  description:        string
}

interface Timesheet { id: string; status: string; lines: TimesheetLine[]; travelPeriods: TravelPeriodInput[]; mileageEntries: MileageEntryInput[] }

interface ProjectPermission {
  projectId:                 string
  overtimeAllowed:           boolean
  overtimeWeekdayMultiplier: number
  overtimeWeekendMultiplier: number
  onCallAllowed:             boolean
  onCallWeeklyRate:          number
  expensesAllowed:           boolean
  expensesMonthlyLimit:      number | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_LINE_TYPES = [
  { value: 'WORK',           label: 'Trabalho'      },
  { value: 'VACATION',       label: 'Férias'         },
  { value: 'SICK_LEAVE',     label: 'Baixa Médica'   },
  { value: 'PUBLIC_HOLIDAY', label: 'Feriado'        },
  { value: 'OTHER_ABSENCE',  label: 'Outra Ausência' },
]
const ON_CALL_TYPE = { value: 'ON_CALL', label: 'On-Call (semana)' }

const OVERTIME_MULTIPLIERS = [
  { value: 1.5, label: '150% — hora extra semana'       },
  { value: 2.0, label: '200% — fim de semana / feriado' },
]

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Rascunho', SUBMITTED: 'Submetida', APPROVED: 'Aprovada', REJECTED: 'Rejeitada',
}

const lineBase = 'text-xs rounded px-2 py-1.5 focus:ring-1'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) { return new Date(year, month, 0).getDate() }
function isWeekend(y: number, m: number, d: number) { const dow = new Date(y, m - 1, d).getDay(); return dow === 0 || dow === 6 }
function formatDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}
function defaultBulk(days: number) {
  return { fromDay: 1, toDay: days, type: 'WORK', projectId: '', hours: 8, extraHours: 0, workdaysOnly: true }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TimesheetGrid({ employeeId }: { employeeId?: string }) {
  const now = new Date()
  const [year,        setYear]        = useState(now.getFullYear())
  const [month,       setMonth]       = useState(now.getMonth() + 1)
  const [timesheet,   setTimesheet]   = useState<Timesheet | null>(null)
  const [lines,       setLines]       = useState<TimesheetLine[]>([])
  const [travelPeriods, setTravelPeriods] = useState<TravelPeriodInput[]>([])
  const [mileageEntries, setMileageEntries] = useState<MileageEntryInput[]>([])
  const [projects,    setProjects]    = useState<Project[]>([])
  const [permissions, setPermissions] = useState<Record<string, ProjectPermission>>({})
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [message,     setMessage]     = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const days = getDaysInMonth(year, month)
  const [bulkOpen,    setBulkOpen]   = useState(false)
  const [importOpen,  setImportOpen] = useState(false)
  const [refreshKey,  setRefreshKey] = useState(0)
  const [bulk,        setBulk]       = useState(() => defaultBulk(days))

  const isLocked = timesheet?.status === 'SUBMITTED' || timesheet?.status === 'APPROVED'

  // ── Data fetching ─────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/projects').then(r => r.json()).then(setProjects)
    fetch(`/api/my-project-permissions${employeeId ? `?employeeId=${employeeId}` : ''}`).then(r => r.json()).then(setPermissions)
  }, [employeeId])

  useEffect(() => {
    setLoading(true)
    setBulkOpen(false)
    fetch(`/api/timesheets?month=${month}&year=${year}${employeeId ? `&employeeId=${employeeId}` : ''}`)
      .then(r => r.json())
      .then(data => {
        setTimesheet(data)
        setLines((data?.lines ?? []).map((l: TimesheetLine) => ({
          ...l, overtimeMultiplier: l.overtimeMultiplier != null ? Number(l.overtimeMultiplier) : null,
        })))
        setTravelPeriods((data?.travelPeriods ?? []).map((p: TravelPeriodInput) => ({ ...p, startDate: p.startDate.substring(0, 10), endDate: p.endDate.substring(0, 10), description: p.description ?? '' })))
        setMileageEntries((data?.mileageEntries ?? []).map((m: MileageEntryInput) => ({ ...m, date: m.date.substring(0, 10), kilometres: Number(m.kilometres), purpose: m.purpose ?? '', vehiclePlate: m.vehiclePlate ?? '' })))
        setLoading(false)
      })
  }, [month, year, employeeId, refreshKey])

  useEffect(() => { setBulk(defaultBulk(getDaysInMonth(year, month))) }, [year, month])

  // ── Helpers ───────────────────────────────────────────────────────────────

  function showMsg(type: 'success' | 'error', text: string) {
    setMessage({ type, text }); setTimeout(() => setMessage(null), 3500)
  }

  function perm(pid: string | null): ProjectPermission | null {
    return pid ? (permissions[pid] ?? null) : null
  }

  function defaultMult(dateStr: string, pid: string | null): number {
    const p = perm(pid)
    if (!p) return 1.5
    const d = new Date(dateStr + 'T00:00:00')
    const wkd = d.getDay() === 0 || d.getDay() === 6
    return wkd ? Number(p.overtimeWeekendMultiplier) : Number(p.overtimeWeekdayMultiplier)
  }

  // ── Line operations ───────────────────────────────────────────────────────

  function addLine(day: number) {
    setLines(prev => [...prev, {
      date: formatDate(year, month, day),
      projectId: projects[0]?.id ?? null,
      type: 'WORK', hours: 8, extraHours: 0, overtimeMultiplier: null, description: '',
    }])
  }

  function removeLine(i: number) { setLines(prev => prev.filter((_, idx) => idx !== i)) }

  function updateLine(i: number, field: keyof TimesheetLine, value: unknown) {
    setLines(prev => prev.map((l, idx) => {
      if (idx !== i) return l
      const u = { ...l, [field]: value }
      if (field === 'extraHours' && Number(value) > 0 && !l.overtimeMultiplier)
        u.overtimeMultiplier = defaultMult(l.date, l.projectId)
      if (field === 'extraHours' && Number(value) === 0)
        u.overtimeMultiplier = null
      if (field === 'projectId' && Number(l.extraHours) > 0)
        u.overtimeMultiplier = defaultMult(l.date, value as string | null)
      return u
    }))
  }

  // ── Bulk fill ─────────────────────────────────────────────────────────────

  function applyBulk() {
    const totalDays = getDaysInMonth(year, month)
    const newLines: TimesheetLine[] = []
    for (let d = bulk.fromDay; d <= Math.min(bulk.toDay, totalDays); d++) {
      if (bulk.workdaysOnly && isWeekend(year, month, d)) continue
      const proj = (bulk.type === 'WORK' || bulk.type === 'ON_CALL')
        ? (bulk.projectId || projects[0]?.id || null) : null
      newLines.push({
        date: formatDate(year, month, d), projectId: proj, type: bulk.type,
        hours: bulk.hours, extraHours: bulk.extraHours, overtimeMultiplier: null, description: '',
      })
    }
    setLines(prev => [...prev, ...newLines])
    setBulkOpen(false)
  }

  // ── Save / Submit ─────────────────────────────────────────────────────────

  async function save() {
    setSaving(true)
    try {
      const body = {
        month, year,
        ...(employeeId ? { employeeId } : {}),
        lines: lines.map(l => ({
          date:               new Date(l.date.substring(0, 10) + 'T00:00:00.000Z').toISOString(),
          projectId:          l.projectId ?? null,
          type:               l.type,
          hours:              Number(l.hours),
          extraHours:         Number(l.extraHours),
          overtimeMultiplier: Number(l.extraHours) > 0 && l.overtimeMultiplier ? Number(l.overtimeMultiplier) : null,
          description:        l.description || null,
        })),
        travelPeriods,
        mileageEntries,
      }
      const res = await fetch('/api/timesheets', {
        method: timesheet ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(typeof err.error === 'string' ? err.error : 'Erro ao guardar.') }
      const data = await res.json()
      setTimesheet(data)
      setLines(data.lines.map((l: TimesheetLine) => ({ ...l, overtimeMultiplier: l.overtimeMultiplier != null ? Number(l.overtimeMultiplier) : null })))
      showMsg('success', 'Guardado com sucesso!')
    } catch (error) { showMsg('error', error instanceof Error ? error.message : 'Erro ao guardar. Tenta novamente.') } finally { setSaving(false) }
  }

  async function submit() {
    if (!timesheet) { showMsg('error', 'Guarda primeiro antes de submeter.'); return }
    if (!confirm('Tens a certeza que queres submeter esta timesheet? Não poderás editar após submissão.')) return
    setSaving(true)
    try {
      const res = await fetch('/api/timesheets/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timesheetId: timesheet.id }),
      })
      if (!res.ok) throw new Error()
      setTimesheet(await res.json())
      showMsg('success', 'Timesheet submetida com sucesso!')
    } catch { showMsg('error', 'Erro ao submeter.') } finally { setSaving(false) }
  }

  function prevMonth() { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  // ── Derived ───────────────────────────────────────────────────────────────

  const monthName  = new Date(year, month - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
  const anyOnCall  = Object.values(permissions).some(p => p.onCallAllowed)
  const lineTypes  = anyOnCall ? [...BASE_LINE_TYPES, ON_CALL_TYPE] : BASE_LINE_TYPES
  const totalHours = lines.reduce((s, l) => s + Number(l.hours) + Number(l.extraHours), 0)

  const linesByDay: Record<string, (TimesheetLine & { _idx: number })[]> = {}
  lines.forEach((line, idx) => {
    const k = line.date.substring(0, 10)
    if (!linesByDay[k]) linesByDay[k] = []
    linesByDay[k].push({ ...line, _idx: idx })
  })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft size={18} /></Button>
          <h2 className="text-lg font-semibold capitalize text-zinc-100 w-48 text-center">{monthName}</h2>
          <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight size={18} /></Button>
          {timesheet && <StatusBadge status={timesheet.status} label={STATUS_LABEL[timesheet.status]} />}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500 mr-1">Total: <strong className="text-zinc-300">{totalHours}h</strong></span>
          {!isLocked && (
            <>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <FileSpreadsheet size={15} /> Importar Excel
              </Button>
              <Button variant="outline" onClick={() => setBulkOpen(o => !o)}>
                <CalendarRange size={15} /> Preencher dias
              </Button>
              <Button variant="outline" disabled={saving} onClick={save}>
                <Save size={15} /> {saving ? 'A guardar...' : 'Guardar'}
              </Button>
              <Button disabled={saving || !timesheet} onClick={submit}>
                <Send size={15} /> Submeter
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Bulk fill panel */}
      {bulkOpen && !isLocked && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-200">Preencher dias em massa</p>
            <button onClick={() => setBulkOpen(false)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">De</label>
              <SelectNative value={bulk.fromDay} onChange={e => setBulk(b => ({ ...b, fromDay: Number(e.target.value) }))} className={`${lineBase} w-20`}>
                {Array.from({ length: days }, (_, i) => i + 1).map(d => <option key={d} value={d}>{String(d).padStart(2,'0')}</option>)}
              </SelectNative>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">Até</label>
              <SelectNative value={bulk.toDay} onChange={e => setBulk(b => ({ ...b, toDay: Number(e.target.value) }))} className={`${lineBase} w-20`}>
                {Array.from({ length: days }, (_, i) => i + 1).map(d => <option key={d} value={d}>{String(d).padStart(2,'0')}</option>)}
              </SelectNative>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-500">Tipo</label>
              <SelectNative value={bulk.type} onChange={e => setBulk(b => ({ ...b, type: e.target.value }))} className={`${lineBase} w-40`}>
                {lineTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </SelectNative>
            </div>
            {(bulk.type === 'WORK' || bulk.type === 'ON_CALL') && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-500">Projecto</label>
                <SelectNative value={bulk.projectId} onChange={e => setBulk(b => ({ ...b, projectId: e.target.value }))} className={`${lineBase} max-w-[200px]`}>
                  <option value="">{projects[0]?.name ?? 'Primeiro projecto'}</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </SelectNative>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-zinc-500">{bulk.type === 'ON_CALL' ? 'Semanas' : 'Horas'}</label>
              <Input type="number" min="0" max="52" step="0.5" value={bulk.hours} onChange={e => setBulk(b => ({ ...b, hours: parseFloat(e.target.value) || 0 }))} className={`${lineBase} w-16 text-center`} />
            </div>
            {bulk.type === 'WORK' && (
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-zinc-500">Extra</label>
                <Input type="number" min="0" max="24" step="0.5" value={bulk.extraHours} onChange={e => setBulk(b => ({ ...b, extraHours: parseFloat(e.target.value) || 0 }))} className={`${lineBase} w-16 text-center`} />
              </div>
            )}
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-400 select-none">
              <input type="checkbox" checked={bulk.workdaysOnly} onChange={e => setBulk(b => ({ ...b, workdaysOnly: e.target.checked }))} className="accent-violet-500 w-3.5 h-3.5" />
              Só dias úteis
            </label>
            <Button size="sm" onClick={applyBulk} className="ml-auto">Aplicar</Button>
            <Button size="sm" variant="ghost" onClick={() => setBulkOpen(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {message && <FormMessage type={message.type}>{message.text}</FormMessage>}

      <TravelCompensationEditor key={`${year}-${month}`} projects={projects} travelPeriods={travelPeriods} mileageEntries={mileageEntries} onTravelChange={setTravelPeriods} onMileageChange={setMileageEntries} locked={isLocked} month={month} year={year} />

      {/* Days grid */}
      {loading ? (
        <div className="text-center py-20 text-zinc-600">A carregar...</div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {Array.from({ length: days }, (_, i) => i + 1).map(day => {
            const date     = formatDate(year, month, day)
            const weekend  = isWeekend(year, month, day)
            const dayLines = linesByDay[date] ?? []
            const dow      = new Date(year, month - 1, day).toLocaleDateString('pt-PT', { weekday: 'short' })

            return (
              <div key={day} className={`border-b border-border last:border-0 ${weekend ? 'bg-secondary/20' : ''}`}>
                <div className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-3 w-24 shrink-0">
                    <span className={`text-sm font-semibold ${weekend ? 'text-zinc-600' : 'text-zinc-300'}`}>
                      {String(day).padStart(2, '0')}
                    </span>
                    <span className={`text-xs capitalize ${weekend ? 'text-zinc-700' : 'text-zinc-500'}`}>{dow}</span>
                  </div>
                  <div className="flex-1">
                    {dayLines.length === 0 && (
                      <span className="text-xs text-zinc-700 italic">{weekend ? 'Fim de semana' : 'Sem registos'}</span>
                    )}
                  </div>
                  {!isLocked && (
                    <button onClick={() => addLine(day)} className="flex items-center gap-1 text-xs text-violet-500 hover:text-violet-300 px-2 py-1 hover:bg-violet-600/10 rounded transition-colors">
                      <Plus size={13} /> Adicionar
                    </button>
                  )}
                </div>

                {dayLines.map(line => {
                  const lp       = perm(line.projectId)
                  const showOT   = line.type === 'WORK'
                  const isOC     = line.type === 'ON_CALL'
                  const agMult   = defaultMult(line.date, line.projectId)
                  const mismatch = showOT && Number(line.extraHours) > 0
                                   && line.overtimeMultiplier != null
                                   && Number(line.overtimeMultiplier) !== agMult

                  return (
                    <div key={line._idx} className="flex items-center gap-2 px-4 pb-2 pl-16 flex-wrap">

                      {/* Tipo */}
                      <div className="w-36 shrink-0">
                        <SelectNative value={line.type} disabled={isLocked} onChange={e => updateLine(line._idx, 'type', e.target.value)} className={lineBase}>
                          {lineTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </SelectNative>
                      </div>

                      {/* Projecto (WORK + ON_CALL) */}
                      {(line.type === 'WORK' || line.type === 'ON_CALL') && (
                        <div className="w-44 shrink-0">
                          <SelectNative value={line.projectId ?? ''} disabled={isLocked} onChange={e => updateLine(line._idx, 'projectId', e.target.value || null)} className={lineBase}>
                            <option value="">Sem projecto</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </SelectNative>
                        </div>
                      )}

                      {/* Horas / Semanas */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Input
                          type="number" min="0" max={isOC ? 52 : 24} step={isOC ? 1 : 0.5}
                          value={line.hours} disabled={isLocked}
                          onChange={e => updateLine(line._idx, 'hours', parseFloat(e.target.value) || 0)}
                          className={`${lineBase} w-14 text-center`}
                        />
                        <span className="text-xs text-zinc-600">{isOC ? 'sem' : 'h'}</span>
                      </div>

                      {/* Horas extra + multiplicador — apenas se overtimeAllowed */}
                      {showOT && (
                        <>
                          <div className="flex items-center gap-1 shrink-0">
                            <Input
                              type="number" min="0" max="24" step="0.5"
                              value={line.extraHours} disabled={isLocked}
                              onChange={e => updateLine(line._idx, 'extraHours', parseFloat(e.target.value) || 0)}
                              className={`${lineBase} w-14 text-center`}
                            />
                            <span className="text-xs text-zinc-600">ext</span>
                          </div>
                          {Number(line.extraHours) > 0 && (
                            <div className="shrink-0">
                              <SelectNative
                                value={line.overtimeMultiplier ?? agMult}
                                disabled={isLocked}
                                onChange={e => updateLine(line._idx, 'overtimeMultiplier', parseFloat(e.target.value))}
                                className={`${lineBase} w-48 ${mismatch ? 'border-amber-500/50 text-amber-300' : ''}`}
                              >
                                {OVERTIME_MULTIPLIERS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                              </SelectNative>
                            </div>
                          )}
                          {mismatch && !isLocked && (
                            <span className="flex items-center gap-1 text-xs text-amber-400 shrink-0">
                              <AlertTriangle size={12} /> Difere do acordado
                            </span>
                          )}
                        </>
                      )}

                      {/* Descrição ou info on-call */}
                      {!isOC ? (
                        <Input
                          type="text" placeholder="Descrição..."
                          value={line.description} disabled={isLocked}
                          onChange={e => updateLine(line._idx, 'description', e.target.value)}
                          className={`${lineBase} flex-1 min-w-0`}
                        />
                      ) : (
                        <span className="text-xs text-zinc-500 flex-1">
                          {lp
                            ? `${Number(lp.onCallWeeklyRate).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}/semana`
                            : 'Taxa on-call não configurada neste projecto'}
                        </span>
                      )}

                      {!isLocked && (
                        <Button variant="ghost" size="icon" onClick={() => removeLine(line._idx)} className="hover:text-red-400 shrink-0">
                          <Trash2 size={13} />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Import modal */}
      {importOpen && (
        <ImportTimesheetModal
          projects={projects}
          employeeId={employeeId}
          onClose={() => setImportOpen(false)}
          onImported={(m, y) => {
            setImportOpen(false)
            if (m === month && y === year) {
              setRefreshKey(k => k + 1)   // mesmo mês: força re-fetch
            } else {
              setMonth(m)
              setYear(y)                  // mês diferente: mudar mês já dispara o useEffect
            }
          }}
        />
      )}
    </div>
  )
}
