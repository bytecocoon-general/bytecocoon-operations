'use client'

/**
 * ImportTimesheetModal
 *
 * Three-step wizard:
 *   1. Upload   — drag & drop or click to upload an .xlsx/.xls file
 *   2. Preview  — detected format, month/year, consultant, line table, project picker
 *   3. Result   — summary of inserted / skipped lines
 */

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react'
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, X, Loader2, ChevronDown } from 'lucide-react'
import { Button }       from '@/components/ui/button'
import { SelectNative } from '@/components/ui/select-native'
import { FormMessage }  from '@/components/ui/form-message'
import type { ParseResult } from '@/lib/timesheet-parsers'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Project { id: string; name: string; client: { name: string } | null }

interface ImportResult {
  inserted: number
  skipped:  number
  total:    number
  month:    number
  year:     number
}

interface Props {
  projects:   Project[]
  employeeId?: string
  onClose:    () => void
  onImported: (month: number, year: number) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

const TYPE_LABEL: Record<string, string> = {
  WORK:           'Trabalho',
  VACATION:       'Férias',
  SICK_LEAVE:     'Baixa',
  PUBLIC_HOLIDAY: 'Feriado',
  TRAINING:       'Formação',
}

function typeColour(type: string): string {
  switch (type) {
    case 'WORK':           return 'text-blue-400'
    case 'VACATION':       return 'text-emerald-400'
    case 'SICK_LEAVE':     return 'text-red-400'
    case 'TRAINING':       return 'text-amber-400'
    case 'PUBLIC_HOLIDAY': return 'text-violet-400'
    default:               return 'text-muted-foreground'
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ImportTimesheetModal({ projects, employeeId, onClose, onImported }: Props) {
  const [step,      setStep]      = useState<'upload' | 'preview' | 'result'>('upload')
  const [dragging,  setDragging]  = useState(false)
  const [parsing,   setParsing]   = useState(false)
  const [importing, setImporting] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [result,    setResult]    = useState<ParseResult | null>(null)
  const [importRes, setImportRes] = useState<ImportResult | null>(null)
  const [projectId, setProjectId] = useState<string>(() => projects[0]?.id ?? '')
  const [showAll,   setShowAll]   = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  // ── File processing ─────────────────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('Formato inválido. Selecciona um ficheiro .xlsx ou .xls.')
      return
    }
    setError(null)
    setParsing(true)
    try {
      // Dynamic import — xlsx is large, only load when needed
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array', raw: true })

      // Dynamic import of parser (avoids SSR issues)
      const { parseTimesheetFile } = await import('@/lib/timesheet-parsers')
      const parsed = parseTimesheetFile(wb)
      setResult(parsed)
      setStep('preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao processar o ficheiro.')
    } finally {
      setParsing(false)
    }
  }, [])

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) processFile(f)
    e.target.value = ''   // reset so the same file can be re-selected
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) processFile(f)
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  async function runImport() {
    if (!result) return
    setImporting(true)
    setError(null)
    try {
      const res = await fetch('/api/timesheets/import', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          month:     result.month,
          year:      result.year,
          projectId: projectId || null,
          ...(employeeId ? { employeeId } : {}),
          lines:     result.lines.map(l => ({
            date:        l.date,
            hours:       l.hours,
            extraHours:  l.extraHours,
            type:        l.type,
            description: l.description,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao importar.')
      setImportRes({ ...data, month: result.month, year: result.year })
      setStep('result')
      onImported(result.month, result.year)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao importar.')
    } finally {
      setImporting(false)
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const workLines     = result?.lines.filter(l => l.type === 'WORK')           ?? []
  const absenceLines  = result?.lines.filter(l => l.type !== 'WORK')           ?? []
  const totalWorkHrs  = workLines.reduce((s, l) => s + l.hours + l.extraHours, 0)
  const previewLines  = result?.lines ?? []
  const visibleLines  = showAll ? previewLines : previewLines.slice(0, 10)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
              <FileSpreadsheet size={16} className="text-violet-400" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground text-sm">Importar Timesheet</h2>
              <p className="text-xs text-muted-foreground">
                {step === 'upload'  && 'Selecciona um ficheiro Excel'}
                {step === 'preview' && result && `${result.format} · ${MONTH_PT[result.month - 1]} ${result.year}`}
                {step === 'result'  && 'Importação concluída'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-secondary">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* ── Step 1: Upload ── */}
          {step === 'upload' && (
            <>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={[
                  'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all select-none',
                  dragging
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-border hover:border-violet-500/60 hover:bg-violet-500/5',
                ].join(' ')}
              >
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onFileChange} />
                {parsing ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 size={32} className="text-violet-400 animate-spin" />
                    <p className="text-sm text-muted-foreground">A analisar o ficheiro…</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-violet-600/15 flex items-center justify-center">
                      <Upload size={22} className="text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Arrasta o ficheiro ou clica para seleccionar</p>
                      <p className="text-xs text-muted-foreground mt-1">Suporta .xlsx e .xls</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Supported formats */}
              <div className="bg-secondary/40 rounded-xl p-4 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Formatos suportados</p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-xs text-foreground font-medium">Halian / ACTIUM-IO</span>
                  <span className="text-xs text-muted-foreground">— folha &quot;Halian TS&quot;</span>
                </div>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Outros formatos serão adicionados progressivamente.
                </p>
              </div>
            </>
          )}

          {/* ── Step 2: Preview ── */}
          {step === 'preview' && result && (
            <>
              {/* Detected info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-secondary/40 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1">Formato</p>
                  <p className="text-sm font-medium text-foreground">{result.format}</p>
                </div>
                <div className="bg-secondary/40 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1">Período</p>
                  <p className="text-sm font-medium text-foreground capitalize">{MONTH_PT[result.month - 1]} {result.year}</p>
                </div>
                {result.consultant && (
                  <div className="bg-secondary/40 rounded-xl p-3">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1">Consultor</p>
                    <p className="text-sm font-medium text-foreground">{result.consultant}</p>
                  </div>
                )}
                <div className="bg-secondary/40 rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold mb-1">Horas (trabalho)</p>
                  <p className="text-sm font-medium text-foreground">{totalWorkHrs.toFixed(1)} h
                    <span className="text-muted-foreground text-xs ml-1">({workLines.length} linhas)</span>
                  </p>
                </div>
              </div>

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="flex items-start gap-2 bg-amber-950/30 border border-amber-800/30 rounded-xl p-3">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    {result.warnings.map((w, i) => <p key={i} className="text-xs text-amber-300">{w}</p>)}
                  </div>
                </div>
              )}

              {/* Project selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Projecto de destino
                </label>
                <SelectNative
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="text-sm w-full"
                >
                  <option value="">Sem projecto</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}{p.client ? ` — ${p.client.name}` : ''}</option>
                  ))}
                </SelectNative>
                <p className="text-xs text-muted-foreground">
                  As linhas de ausência (férias, baixa, formação) não são associadas a projecto.
                </p>
              </div>

              {/* Preview table */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Pré-visualização ({previewLines.length} linhas)
                  </label>
                  {absenceLines.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {absenceLines.length} ausência{absenceLines.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="bg-secondary/20 rounded-xl overflow-hidden border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-3 py-2 text-muted-foreground/70 font-medium">Data</th>
                        <th className="text-left px-3 py-2 text-muted-foreground/70 font-medium">Tipo</th>
                        <th className="text-right px-3 py-2 text-muted-foreground/70 font-medium">Horas</th>
                        <th className="text-right px-3 py-2 text-muted-foreground/70 font-medium">Extra</th>
                        <th className="text-left px-3 py-2 text-muted-foreground/70 font-medium hidden sm:table-cell">Nota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleLines.map((l, i) => {
                        const d    = new Date(l.date + 'T00:00:00')
                        const dow  = d.toLocaleDateString('pt-PT', { weekday: 'short' })
                        const day  = `${String(d.getDate()).padStart(2,'0')} ${dow}`
                        return (
                          <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-secondary/30">
                            <td className="px-3 py-1.5 font-mono text-muted-foreground">{day}</td>
                            <td className={`px-3 py-1.5 font-medium ${typeColour(l.type)}`}>
                              {TYPE_LABEL[l.type] ?? l.type}
                              {l.rawRate > 1 && <span className="text-muted-foreground/60 ml-1">×{l.rawRate}</span>}
                            </td>
                            <td className="px-3 py-1.5 text-right text-foreground">{l.hours > 0 ? `${l.hours}h` : '—'}</td>
                            <td className="px-3 py-1.5 text-right text-amber-400">{l.extraHours > 0 ? `${l.extraHours}h` : '—'}</td>
                            <td className="px-3 py-1.5 text-muted-foreground/70 hidden sm:table-cell truncate max-w-[12rem]">{l.description ?? '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {previewLines.length > 10 && (
                    <button
                      onClick={() => setShowAll(o => !o)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-border"
                    >
                      <ChevronDown size={13} className={showAll ? 'rotate-180 transition-transform' : 'transition-transform'} />
                      {showAll ? 'Mostrar menos' : `Ver mais ${previewLines.length - 10} linhas`}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Step 3: Result ── */}
          {step === 'result' && importRes && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-emerald-400" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Importação concluída</p>
                  <p className="text-sm text-muted-foreground mt-0.5 capitalize">
                    {MONTH_PT[importRes.month - 1]} {importRes.year}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{importRes.inserted}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Inseridas</p>
                </div>
                <div className="bg-secondary/40 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-muted-foreground">{importRes.skipped}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Ignoradas</p>
                </div>
                <div className="bg-secondary/40 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{importRes.total}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Total</p>
                </div>
              </div>
              {importRes.skipped > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  As linhas ignoradas já existiam na timesheet (duplicados).
                </p>
              )}
            </div>
          )}

          {/* Global error */}
          {error && <FormMessage type="error">{error}</FormMessage>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0 gap-3">
          {step === 'upload' && (
            <>
              <span className="text-xs text-muted-foreground">O sistema não substitui horas existentes.</span>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
            </>
          )}

          {step === 'preview' && result && (
            <>
              <button
                onClick={() => { setStep('upload'); setResult(null); setError(null) }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Voltar
              </button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>Cancelar</Button>
                <Button onClick={runImport} disabled={importing}>
                  {importing
                    ? <><Loader2 size={14} className="animate-spin" /> A importar…</>
                    : <><Upload size={14} /> Importar {result.lines.length} linha{result.lines.length !== 1 ? 's' : ''}</>}
                </Button>
              </div>
            </>
          )}

          {step === 'result' && (
            <div className="flex gap-2 ml-auto">
              <Button onClick={onClose}>Fechar</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
