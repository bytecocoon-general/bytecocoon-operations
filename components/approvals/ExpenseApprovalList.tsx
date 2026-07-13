'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Receipt } from 'lucide-react'
import { Button }      from '@/components/ui/button'
import { Textarea }    from '@/components/ui/textarea'
import { FormMessage } from '@/components/ui/form-message'
import { StatusBadge } from '@/components/ui/badge'
import { cn }          from '@/lib/utils'

interface Employee { name: string; department: { name: string } }

interface Expense {
  id:          string
  date:        string
  category:    string
  amount:      number
  description: string | null
  status:      string
  submittedAt: string | null
  reviewNote:  string | null
  employee:    Employee
  project:     { id: string; name: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  SUBMITTED: 'Submetida', APPROVED: 'Aprovada', PROCESSING: 'Em Processamento', PAID: 'Paga', REJECTED: 'Rejeitada', DRAFT: 'Rascunho',
}

const EMPTY_STATE_LABEL: Record<string, string> = {
  SUBMITTED: 'submetidas', APPROVED: 'aprovadas', PROCESSING: 'em processamento', PAID: 'pagas', REJECTED: 'rejeitadas', DRAFT: 'em rascunho',
}

interface Props {
  onCountChange?: (count: number) => void
}

export default function ExpenseApprovalList({ onCountChange }: Props) {
  const [expenses,   setExpenses]   = useState<Expense[]>([])
  const [filter,     setFilter]     = useState<string>('SUBMITTED')
  const [loading,    setLoading]    = useState(true)
  const [rejectId,   setRejectId]   = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [saving,     setSaving]     = useState(false)
  const [message,    setMessage]    = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text }); setTimeout(() => setMessage(null), 3000)
  }

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/expenses?status=${filter}`)
      .then(r => r.json())
      .then(data => {
        setExpenses(data)
        setLoading(false)
        if (filter === 'SUBMITTED') onCountChange?.(data.length)
      })
  }, [filter, onCountChange])

  async function handleAction(id: string, action: 'APPROVED' | 'REJECTED', note?: string) {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/expenses/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      showMessage('success', action === 'APPROVED' ? 'Despesa aprovada!' : 'Despesa rejeitada.')
      setExpenses(prev => prev.filter(e => e.id !== id))
      if (filter === 'SUBMITTED') onCountChange?.(expenses.length - 1)
      setRejectId(null); setRejectNote('')
    } catch (e: unknown) {
      showMessage('error', (e as Error).message ?? 'Erro ao processar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatus(id: string, status: 'PROCESSING' | 'PAID') {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error) }
      showMessage('success', status === 'PAID' ? 'Despesa marcada como paga!' : 'Despesa em processamento.')
      setExpenses(prev => prev.filter(e => e.id !== id))
    } catch (e: unknown) {
      showMessage('error', (e as Error).message ?? 'Erro ao processar.')
    } finally {
      setSaving(false)
    }
  }

  const totalAmount = expenses.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div className="space-y-4">

      {/* Filtros */}
      <div className="flex gap-2">
        {(['SUBMITTED', 'APPROVED', 'PROCESSING', 'PAID', 'REJECTED'] as const).map(s => (
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
      ) : expenses.length === 0 ? (
        <div className="bg-card rounded-xl border border-border px-6 py-16 text-center">
          <Receipt size={36} className="text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500">Não há despesas {EMPTY_STATE_LABEL[filter]}.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Colaborador</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Data</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Categoria</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Projecto</th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Descrição</th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Montante</th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-zinc-500 uppercase tracking-wide">Estado</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {expenses.map(e => (
                <>
                  <tr key={e.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-zinc-200">{e.employee.name}</p>
                      <p className="text-xs text-zinc-500">{e.employee.department.name}</p>
                    </td>
                    <td className="px-3 py-3 text-zinc-400">{e.date.slice(0, 10)}</td>
                    <td className="px-3 py-3 text-zinc-400">{e.category}</td>
                    <td className="px-3 py-3 text-zinc-500">{e.project?.name ?? '—'}</td>
                    <td className="px-3 py-3 text-zinc-500 max-w-[200px] truncate">{e.description ?? '—'}</td>
                    <td className="px-3 py-3 text-right font-semibold text-zinc-200">€{Number(e.amount).toFixed(2)}</td>
                    <td className="px-3 py-3 text-center">
                      <StatusBadge status={e.status} label={STATUS_LABEL[e.status]} />
                    </td>
                    <td className="px-5 py-3">
                      {e.status === 'SUBMITTED' && (
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => handleAction(e.id, 'APPROVED')}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950 text-emerald-400 border border-emerald-800/30 text-xs rounded-lg hover:bg-emerald-900 disabled:opacity-40 transition-colors"
                          >
                            <CheckCircle size={13} /> Aprovar
                          </button>
                          <button
                            onClick={() => setRejectId(rejectId === e.id ? null : e.id)}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950 text-red-400 border border-red-800/30 text-xs rounded-lg hover:bg-red-900 disabled:opacity-40 transition-colors"
                          >
                            <XCircle size={13} /> Rejeitar
                          </button>
                        </div>
                      )}
                      {e.status === 'APPROVED' && (
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleStatus(e.id, 'PROCESSING')}
                            disabled={saving}
                            className="text-xs px-3 py-1.5 bg-blue-950 text-blue-400 border border-blue-800/30 rounded-lg hover:bg-blue-900 disabled:opacity-40 transition-colors"
                          >
                            Processar
                          </button>
                        </div>
                      )}
                      {e.status === 'PROCESSING' && (
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleStatus(e.id, 'PAID')}
                            disabled={saving}
                            className="text-xs px-3 py-1.5 bg-emerald-950 text-emerald-400 border border-emerald-800/30 rounded-lg hover:bg-emerald-900 disabled:opacity-40 transition-colors"
                          >
                            Marcar Paga
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* Rejection note (historical) */}
                  {e.reviewNote && (
                    <tr key={`note-${e.id}`} className="bg-red-950/10">
                      <td colSpan={8} className="px-5 py-2">
                        <p className="text-xs text-red-400"><strong>Nota:</strong> {e.reviewNote}</p>
                      </td>
                    </tr>
                  )}

                  {/* Inline rejection form */}
                  {rejectId === e.id && (
                    <tr key={`reject-${e.id}`} className="bg-red-950/20">
                      <td colSpan={8} className="px-5 py-3 space-y-2">
                        <p className="text-sm font-medium text-zinc-300">Motivo da rejeição (obrigatório):</p>
                        <Textarea
                          value={rejectNote}
                          onChange={ev => setRejectNote(ev.target.value)}
                          placeholder="Descreve o motivo da rejeição..."
                          rows={2}
                          className="focus:ring-red-500/30"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(e.id, 'REJECTED', rejectNote)}
                            disabled={saving || !rejectNote.trim()}
                            className="px-4 py-1.5 bg-red-950 text-red-400 border border-red-800/30 text-sm rounded-lg hover:bg-red-900 disabled:opacity-40 transition-colors"
                          >
                            Confirmar Rejeição
                          </button>
                          <Button variant="outline" size="sm" onClick={() => { setRejectId(null); setRejectNote('') }}>Cancelar</Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
            <tfoot className="bg-secondary/20">
              <tr>
                <td colSpan={5} className="px-5 py-2 text-zinc-500 font-medium">Total</td>
                <td colSpan={3} className="px-5 py-2 text-right font-bold text-zinc-100">
                  €{totalAmount.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
