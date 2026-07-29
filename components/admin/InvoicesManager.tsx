'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Check, X, Receipt, Zap, Search, Ban } from 'lucide-react'
import ClientPickerModal, { type PickedClient } from './ClientPickerModal'
import { Button }       from '@/components/ui/button'
import { Input }        from '@/components/ui/input'
import { SelectNative } from '@/components/ui/select-native'
import { Textarea }     from '@/components/ui/textarea'
import { Label }        from '@/components/ui/label'
import { FormMessage }  from '@/components/ui/form-message'
import { StatusBadge }  from '@/components/ui/badge'

interface Project { id: string; name: string }
interface InvoiceLine {
  id:          string
  description: string
  quantity:    number
  unitPrice:   number
  amount:      number
  project:     { id: string; name: string } | null
}
interface Invoice {
  id:            string
  invoiceNumber: string
  issueDate:     string
  dueDate:       string
  status:        string
  currency:      string
  taxRate:       number
  subtotal:      number
  taxAmount:     number
  total:         number
  notes:         string | null
  client:        { id: string; name: string }
  lines:         InvoiceLine[]
}

type LineForm = { projectId: string; description: string; quantity: string; unitPrice: string }

const emptyForm = {
  clientId: '', clientLabel: '', issueDate: '', dueDate: '', taxRate: '23', currency: 'EUR', notes: '',
  lines: [{ projectId: '', description: '', quantity: '1', unitPrice: '' }] as LineForm[],
}

const STATUS_LABEL: Record<string, string> = { DRAFT: 'Rascunho', SENT: 'Enviada', PAID: 'Paga', OVERDUE: 'Em Atraso', CANCELLED: 'Cancelada' }
const NEXT_STATUS: Record<string, string | undefined> = { DRAFT: 'SENT', SENT: 'PAID', OVERDUE: 'PAID' }

// parseFloat(v) || 23 treats a deliberate 0% tax rate as "empty" and silently resets it to 23 — parse and
// only fall back to the default when the input isn't a valid number at all.
function parseTaxRate(v: string): number {
  const n = parseFloat(v)
  return Number.isNaN(n) ? 23 : n
}

export default function InvoicesManager() {
  const [invoices,     setInvoices]     = useState<Invoice[]>([])
  const [projects,     setProjects]     = useState<Project[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [editing,      setEditing]      = useState<Invoice | null>(null)
  const [form,         setForm]         = useState(emptyForm)
  const [saving,       setSaving]       = useState(false)
  const [message,      setMessage]      = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [genForm,      setGenForm]      = useState({ month: '', year: '', taxRate: '23', dueInDays: '30' })
  const [showGen,      setShowGen]      = useState(false)
  const [generating,   setGenerating]   = useState(false)
  const [showPicker,   setShowPicker]   = useState(false)
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null)

  function showMsg(type: 'success' | 'error', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  const today = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/invoices').then(r => r.json()),
      fetch('/api/admin/projects').then(r => r.json()),
    ]).then(([inv, pr]) => {
      setInvoices(inv)
      setProjects(pr.filter((p: Project & { isActive: boolean }) => p.isActive))
      setLoading(false)
    })
  }, [])

  function openPicker() { setShowPicker(true) }

  function handleClientPicked(c: PickedClient) {
    setForm(f => ({ ...f, clientId: c.id, clientLabel: c.name }))
    setShowPicker(false)
  }

  function startCreate() {
    setEditing(null)
    const due = new Date(); due.setDate(due.getDate() + 30)
    setForm({ ...emptyForm, issueDate: today, dueDate: due.toISOString().slice(0, 10) })
    setShowForm(true)
  }

  function startEdit(inv: Invoice) {
    setEditing(inv)
    setForm({
      clientId: inv.client.id, clientLabel: inv.client.name,
      issueDate: inv.issueDate.slice(0, 10), dueDate: inv.dueDate.slice(0, 10),
      taxRate: String(inv.taxRate), currency: inv.currency, notes: inv.notes ?? '',
      lines: inv.lines.map(l => ({ projectId: l.project?.id ?? '', description: l.description, quantity: String(l.quantity), unitPrice: String(l.unitPrice) })),
    })
    setShowForm(true)
  }

  function cancel() { setShowForm(false); setEditing(null) }

  function addLine() { setForm(p => ({ ...p, lines: [...p.lines, { projectId: '', description: '', quantity: '1', unitPrice: '' }] })) }
  function removeLine(i: number) { setForm(p => ({ ...p, lines: p.lines.filter((_, idx) => idx !== i) })) }
  function updateLine(i: number, k: keyof LineForm, v: string) { setForm(p => ({ ...p, lines: p.lines.map((l, idx) => idx === i ? { ...l, [k]: v } : l) })) }

  const subtotal  = form.lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0), 0)
  const taxAmount = subtotal * ((parseFloat(form.taxRate) || 0) / 100)
  const total     = subtotal + taxAmount

  async function handleSubmit() {
    setSaving(true)
    try {
      const payload = {
        clientId: form.clientId, issueDate: form.issueDate, dueDate: form.dueDate,
        taxRate: parseTaxRate(form.taxRate), currency: form.currency, notes: form.notes || null,
        lines: form.lines.map(l => ({ projectId: l.projectId || null, description: l.description, quantity: parseFloat(l.quantity) || 0, unitPrice: parseFloat(l.unitPrice) || 0 })),
        ...(editing ? { id: editing.id } : {}),
      }
      const res = await fetch('/api/admin/invoices', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      const saved = await res.json()
      if (editing) setInvoices(prev => prev.map(i => i.id === saved.id ? saved : i))
      else setInvoices(prev => [saved, ...prev])
      cancel(); showMsg('success', editing ? 'Fatura actualizada!' : 'Fatura criada!')
    } catch { showMsg('error', 'Erro ao guardar.') } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar esta fatura?')) return
    const res = await fetch(`/api/admin/invoices?id=${id}`, { method: 'DELETE' })
    if (res.ok) { setInvoices(prev => prev.filter(i => i.id !== id)); showMsg('success', 'Fatura eliminada.') }
    else showMsg('error', 'Erro ao eliminar.')
  }

  async function handleStatus(inv: Invoice, status: string) {
    if (status === inv.status) return
    if ((status === 'PAID' || status === 'CANCELLED') && !confirm(`Alterar ${inv.invoiceNumber} para "${STATUS_LABEL[status]}"?`)) return

    setStatusUpdating(inv.id)
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: inv.id, status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Erro ao alterar o estado.')
      setInvoices(prev => prev.map(invoice => invoice.id === data.id ? data : invoice))
      showMsg('success', `${inv.invoiceNumber}: ${STATUS_LABEL[status]}.`)
    } catch (error) {
      showMsg('error', error instanceof Error ? error.message : 'Erro ao alterar o estado.')
    } finally { setStatusUpdating(null) }
  }

  async function handleGenerate() {
    setGenerating(true)
    try {
      const res = await fetch('/api/admin/invoices/from-timesheet', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: parseInt(genForm.month), year: parseInt(genForm.year), taxRate: parseTaxRate(genForm.taxRate), dueInDays: parseInt(genForm.dueInDays) || 30 }),
      })
      const data = await res.json()
      if (!res.ok) { showMsg('error', data.error ?? 'Erro ao gerar.'); return }
      setInvoices(prev => [...data.invoices, ...prev])
      setShowGen(false)
      const warningNote = data.warnings?.length ? ` Atenção: ${data.warnings.join(' ')}` : ''
      showMsg('success', `${data.count} fatura(s) gerada(s) automaticamente!${warningNote}`)
    } catch { showMsg('error', 'Erro ao gerar faturas.') } finally { setGenerating(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-zinc-500">{invoices.length} fatura(s)</p>
        <div className="flex gap-2">
          <button onClick={() => setShowGen(g => !g)} className="flex items-center gap-2 px-4 py-2 bg-blue-950 text-blue-400 border border-blue-800/30 text-sm rounded-lg hover:bg-blue-900 transition-colors">
            <Zap size={15} /> Gerar de Timesheets
          </button>
          <Button onClick={startCreate}><Plus size={15} /> Nova Fatura</Button>
        </div>
      </div>

      {message && <FormMessage type={message.type}>{message.text}</FormMessage>}

      {/* Geração automática */}
      {showGen && (
        <div className="bg-blue-950/30 border border-blue-800/30 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-1">Gerar Faturas a partir de Timesheets Aprovadas</h3>
          <p className="text-xs text-zinc-500 mb-3">Cria uma fatura por colaborador e por cliente, para todas as horas aprovadas neste período.</p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <Label>Mês</Label>
              <SelectNative className="mt-1" value={genForm.month} onChange={e => setGenForm(p => ({ ...p, month: e.target.value }))}>
                <option value="">—</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1)}>
                    {new Date(2000, i).toLocaleDateString('pt-PT', { month: 'long' })}
                  </option>
                ))}
              </SelectNative>
            </div>
            <div>
              <Label>Ano</Label>
              <Input className="mt-1" type="number" value={genForm.year} onChange={e => setGenForm(p => ({ ...p, year: e.target.value }))} placeholder={String(new Date().getFullYear())} />
            </div>
            <div>
              <Label>IVA (%)</Label>
              <Input className="mt-1" type="number" value={genForm.taxRate} onChange={e => setGenForm(p => ({ ...p, taxRate: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button disabled={generating || !genForm.month || !genForm.year} onClick={handleGenerate}>
              <Zap size={14} /> {generating ? 'A gerar...' : 'Gerar Faturas'}
            </Button>
            <Button variant="outline" onClick={() => setShowGen(false)}><X size={14} /> Cancelar</Button>
          </div>
        </div>
      )}

      {/* Formulário manual */}
      {showForm && (
        <div className="bg-secondary/30 border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-4">{editing ? `Editar ${editing.invoiceNumber}` : 'Nova Fatura'}</h3>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div>
              <Label>Cliente *</Label>
              <div className="flex gap-1.5 mt-1">
                <Input readOnly value={form.clientLabel} placeholder="— Seleccionar —" className="flex-1 w-auto cursor-default" />
                <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={openPicker}><Search size={15} /></Button>
                {form.clientId && (
                  <Button type="button" variant="outline" size="icon" className="shrink-0 hover:text-red-400" onClick={() => setForm(f => ({ ...f, clientId: '', clientLabel: '' }))}><X size={15} /></Button>
                )}
              </div>
            </div>
            <div>
              <Label>Data Emissão *</Label>
              <Input className="mt-1" type="date" value={form.issueDate} onChange={e => setForm(p => ({ ...p, issueDate: e.target.value }))} />
            </div>
            <div>
              <Label>Data Vencimento *</Label>
              <Input className="mt-1" type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
            </div>
            <div>
              <Label>IVA (%)</Label>
              <Input className="mt-1" type="number" value={form.taxRate} onChange={e => setForm(p => ({ ...p, taxRate: e.target.value }))} />
            </div>
          </div>

          {/* Linhas da fatura */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <Label>Linhas</Label>
              <Button variant="ghost" size="sm" onClick={addLine} className="text-xs text-primary hover:text-primary/80 h-auto py-1">
                <Plus size={12} /> Adicionar linha
              </Button>
            </div>
            <div className="grid grid-cols-12 gap-2 px-0.5 mb-1">
              {[
                { label: 'Projecto',  span: 'col-span-3' },
                { label: 'Descrição', span: 'col-span-5' },
                { label: 'Qtd',       span: 'col-span-1' },
                { label: 'Preço/un',  span: 'col-span-2' },
                { label: 'Total',     span: 'col-span-1 text-right' },
              ].map(col => (
                <span key={col.label} className={`${col.span} text-[10px] font-medium text-zinc-500 uppercase tracking-wide`}>
                  {col.label}
                </span>
              ))}
            </div>
            <div className="space-y-2">
              {form.lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <SelectNative value={line.projectId} onChange={e => updateLine(i, 'projectId', e.target.value)} className="px-2 py-1.5">
                      <option value="">Sem projecto</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </SelectNative>
                  </div>
                  <div className="col-span-5">
                    <Input value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} placeholder="Descrição" className="px-2 py-1.5" />
                  </div>
                  <div className="col-span-1">
                    <Input type="number" value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} placeholder="Qtd" className="px-2 py-1.5 text-center" />
                  </div>
                  <div className="col-span-2">
                    <Input type="number" step="0.01" value={line.unitPrice} onChange={e => updateLine(i, 'unitPrice', e.target.value)} placeholder="Preço/un" className="px-2 py-1.5" />
                  </div>
                  <div className="col-span-1 text-right text-sm text-zinc-400 font-medium">
                    €{((parseFloat(line.quantity) || 0) * (parseFloat(line.unitPrice) || 0)).toFixed(2)}
                  </div>
                  {form.lines.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeLine(i)} className="hover:text-red-400"><X size={14} /></Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totais */}
          <div className="flex justify-end mb-4">
            <div className="text-sm space-y-1 text-right bg-secondary/30 border border-border rounded-lg px-4 py-3">
              <div className="text-zinc-500">Subtotal: <span className="font-medium text-zinc-300">€{subtotal.toFixed(2)}</span></div>
              <div className="text-zinc-500">IVA ({form.taxRate}%): <span className="font-medium text-zinc-300">€{taxAmount.toFixed(2)}</span></div>
              <div className="text-base font-semibold text-zinc-100 border-t border-border pt-1 mt-1">Total: €{total.toFixed(2)}</div>
            </div>
          </div>

          <div className="mb-4">
            <Label>Notas</Label>
            <Textarea className="mt-1" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
          </div>

          <div className="flex gap-2">
            <Button disabled={saving} onClick={handleSubmit}><Check size={14} /> {saving ? 'A guardar...' : 'Guardar'}</Button>
            <Button variant="outline" onClick={cancel}><X size={14} /> Cancelar</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-zinc-600">A carregar...</div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card border-b border-border">
              <tr>
                {['Nº Fatura','Cliente','Emissão','Vencimento','Estado','Subtotal','IVA','Total',''].map((h, i) => (
                  <th key={i} className={`${[5,6,7].includes(i) ? 'text-right' : 'text-left'} ${i === 0 || i === 8 ? 'px-5' : 'px-3'} py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Receipt size={14} className="text-zinc-600 shrink-0" />
                      <span className="font-medium text-zinc-200">{inv.invoiceNumber}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-zinc-400">{inv.client.name}</td>
                  <td className="px-3 py-3 text-zinc-400">{inv.issueDate.slice(0, 10)}</td>
                  <td className="px-3 py-3 text-zinc-400">{inv.dueDate.slice(0, 10)}</td>
                  <td className="px-3 py-3">
                    {NEXT_STATUS[inv.status] ? (
                      <button
                        type="button"
                        disabled={statusUpdating === inv.id}
                        title={`Alterar para ${STATUS_LABEL[NEXT_STATUS[inv.status]!]}`}
                        onClick={() => handleStatus(inv, NEXT_STATUS[inv.status]!)}
                        className="rounded focus:outline-none focus:ring-2 focus:ring-primary/60 disabled:opacity-50"
                      >
                        <StatusBadge status={inv.status} label={STATUS_LABEL[inv.status]} />
                      </button>
                    ) : (
                      <StatusBadge status={inv.status} label={STATUS_LABEL[inv.status]} />
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-zinc-400">€{Number(inv.subtotal).toFixed(2)}</td>
                  <td className="px-3 py-3 text-right text-zinc-400">€{Number(inv.taxAmount).toFixed(2)}</td>
                  <td className="px-5 py-3 text-right font-semibold text-zinc-200">€{Number(inv.total).toFixed(2)}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(inv)} title="Editar fatura"><Pencil size={14} /></Button>
                      {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                        <Button variant="ghost" size="icon" className="hover:text-amber-400" onClick={() => handleStatus(inv, 'CANCELLED')} title="Cancelar fatura"><Ban size={14} /></Button>
                      )}
                      <Button variant="ghost" size="icon" className="hover:text-red-400" onClick={() => handleDelete(inv.id)} title="Eliminar fatura"><Trash2 size={14} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && <div className="text-center py-12 text-zinc-600 text-sm">Sem faturas registadas.</div>}
        </div>
      )}

      {showPicker && <ClientPickerModal onSelect={handleClientPicked} onClose={() => setShowPicker(false)} />}
    </div>
  )
}
