'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Send, Receipt } from 'lucide-react'
import { Button }       from '@/components/ui/button'
import { Input }        from '@/components/ui/input'
import { SelectNative } from '@/components/ui/select-native'
import { Label }        from '@/components/ui/label'
import { FormMessage }  from '@/components/ui/form-message'
import { StatusBadge }  from '@/components/ui/badge'
import { cn }           from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────────────

interface Project { id: string; name: string }

interface Expense {
  id:          string
  date:        string
  category:    string
  amount:      number
  description: string | null
  status:      string
  submittedAt: string | null
  reviewedAt:  string | null
  reviewNote:  string | null
  project:     { id: string; name: string } | null
}

interface ExpenseForm {
  date:        string
  category:    string
  amount:      string
  projectId:   string
  description: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['Transporte','Refeição','Alojamento','Telecomunicações','Material de Escritório','Formação','Outros']

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Rascunho', SUBMITTED: 'Submetida', APPROVED: 'Aprovada', REJECTED: 'Rejeitada',
}

const FILTERS = ['TODAS', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'] as const

function emptyForm(): ExpenseForm {
  return { date: new Date().toISOString().slice(0, 10), category: 'Transporte', amount: '', projectId: '', description: '' }
}

// ── ExpensesManager ──────────────────────────────────────────────────────────

export default function ExpensesManager() {
  const [expenses,   setExpenses]   = useState<Expense[]>([])
  const [projects,   setProjects]   = useState<Project[]>([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState<typeof FILTERS[number]>('TODAS')
  const [formOpen,   setFormOpen]   = useState(false)
  const [editId,     setEditId]     = useState<string | null>(null)
  const [form,       setForm]       = useState<ExpenseForm>(emptyForm())
  const [saving,     setSaving]     = useState(false)
  const [message,    setMessage]    = useState<{ type: 'success'|'error'; text: string } | null>(null)

  function showMsg(type: 'success'|'error', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const loadExpenses = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/expenses')
    setExpenses(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { fetch('/api/projects').then(r => r.json()).then(setProjects) }, [])
  useEffect(() => { loadExpenses() }, [loadExpenses])

  // ── Form helpers ───────────────────────────────────────────────────────────

  function openNew() {
    setEditId(null)
    setForm(emptyForm())
    setFormOpen(true)
  }

  function openEdit(e: Expense) {
    setEditId(e.id)
    setForm({
      date:        e.date.slice(0, 10),
      category:    e.category,
      amount:      String(Number(e.amount)),
      projectId:   e.project?.id ?? '',
      description: e.description ?? '',
    })
    setFormOpen(true)
  }

  function cancelForm() { setFormOpen(false); setEditId(null); setForm(emptyForm()) }

  function setField(f: Partial<ExpenseForm>) { setForm(prev => ({ ...prev, ...f })) }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async function saveForm() {
    if (!form.amount || Number(form.amount) <= 0) { showMsg('error', 'Montante inválido.'); return }
    setSaving(true)
    try {
      const body = {
        date:        form.date,
        category:    form.category,
        amount:      Number(form.amount),
        projectId:   form.projectId || null,
        description: form.description || null,
      }
      const url    = editId ? `/api/expenses/${editId}` : '/api/expenses'
      const method = editId ? 'PUT' : 'POST'
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      showMsg('success', editId ? 'Despesa actualizada.' : 'Despesa criada.')
      cancelForm()
      loadExpenses()
    } catch (e: unknown) {
      showMsg('error', (e as Error).message ?? 'Erro ao guardar.')
    } finally { setSaving(false) }
  }

  async function deleteExpense(id: string) {
    if (!confirm('Apagar esta despesa?')) return
    const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
    if (res.ok) { showMsg('success', 'Despesa apagada.'); loadExpenses() }
    else showMsg('error', 'Erro ao apagar.')
  }

  async function submitExpense(id: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/expenses/${id}/submit`, { method: 'POST' })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      showMsg('success', 'Despesa submetida para aprovação.')
      loadExpenses()
    } catch (e: unknown) {
      showMsg('error', (e as Error).message ?? 'Erro ao submeter.')
    } finally { setSaving(false) }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = expenses.filter(e => filter === 'TODAS' || e.status === filter)
  const total    = filtered.reduce((s, e) => s + Number(e.amount), 0)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                filter === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary border-border text-zinc-400 hover:bg-secondary/80 hover:text-zinc-200'
              )}
            >
              {f === 'TODAS' ? 'Todas' : STATUS_LABEL[f]}
            </button>
          ))}
          {filtered.length > 0 && (
            <span className="text-xs text-zinc-500 ml-2">
              {filtered.length} despesa{filtered.length !== 1 ? 's' : ''} ·{' '}
              <strong className="text-zinc-300">€{total.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</strong>
            </span>
          )}
        </div>
        {!formOpen && (
          <Button variant="outline" onClick={openNew}>
            <Plus size={15} /> Nova Despesa
          </Button>
        )}
      </div>

      {/* ── Form ──────────────────────────────────────────────────────── */}
      {formOpen && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <p className="text-sm font-medium text-zinc-200">{editId ? 'Editar despesa' : 'Nova despesa'}</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="exp-date">Data</Label>
              <Input id="exp-date" type="date" value={form.date} onChange={e => setField({ date: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="exp-cat">Categoria</Label>
              <div className="mt-1">
                <SelectNative id="exp-cat" value={form.category} onChange={e => setField({ category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </SelectNative>
              </div>
            </div>
            <div>
              <Label htmlFor="exp-amt">Montante (€)</Label>
              <Input id="exp-amt" type="number" min="0" step="0.01" placeholder="0,00" value={form.amount} onChange={e => setField({ amount: e.target.value })} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="exp-proj">Projecto (opcional)</Label>
              <div className="mt-1">
                <SelectNative id="exp-proj" value={form.projectId} onChange={e => setField({ projectId: e.target.value })}>
                  <option value="">Sem projecto</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </SelectNative>
              </div>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <Label htmlFor="exp-desc">Descrição</Label>
              <Input id="exp-desc" type="text" placeholder="Ex: Uber para reunião cliente" value={form.description} onChange={e => setField({ description: e.target.value })} className="mt-1" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={saveForm} disabled={saving}>{saving ? 'A guardar...' : 'Guardar'}</Button>
            <Button variant="outline" onClick={cancelForm}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* ── Feedback ──────────────────────────────────────────────────── */}
      {message && <FormMessage type={message.type}>{message.text}</FormMessage>}

      {/* ── Lista ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-center py-12 text-zinc-600">A carregar...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border px-6 py-12 text-center">
          <Receipt size={32} className="text-zinc-700 mx-auto mb-2" />
          <p className="text-sm text-zinc-500">
            {filter === 'TODAS'
              ? 'Ainda não tens despesas. Clica em "Nova Despesa" para começar.'
              : `Sem despesas com estado "${STATUS_LABEL[filter]}".`}
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Data</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Categoria</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Projecto</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Descrição</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Montante</th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Estado</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(e => (
                <>
                  <tr key={e.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-3 text-zinc-300">{e.date.slice(0, 10)}</td>
                    <td className="px-3 py-3 text-zinc-400">{e.category}</td>
                    <td className="px-3 py-3 text-zinc-500">{e.project?.name ?? '—'}</td>
                    <td className="px-3 py-3 text-zinc-500 max-w-[220px] truncate">{e.description ?? '—'}</td>
                    <td className="px-3 py-3 text-right font-semibold text-zinc-200">€{Number(e.amount).toFixed(2)}</td>
                    <td className="px-3 py-3 text-center">
                      <StatusBadge status={e.status} label={STATUS_LABEL[e.status]} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        {(e.status === 'DRAFT' || e.status === 'REJECTED') && (
                          <>
                            <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => openEdit(e)}>
                              Editar
                            </Button>
                            {e.status === 'DRAFT' && (
                              <Button variant="ghost" size="sm" className="text-xs h-7 px-2 gap-1 text-violet-400 hover:text-violet-300" onClick={() => submitExpense(e.id)} disabled={saving}>
                                <Send size={12} /> Submeter
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="hover:text-red-400 h-7 w-7" onClick={() => deleteExpense(e.id)}>
                              <Trash2 size={13} />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {e.status === 'REJECTED' && e.reviewNote && (
                    <tr key={`note-${e.id}`} className="bg-red-950/10">
                      <td colSpan={7} className="px-5 py-2">
                        <p className="text-xs text-red-400"><strong>Motivo da rejeição:</strong> {e.reviewNote}</p>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
