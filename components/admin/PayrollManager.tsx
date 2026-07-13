'use client'

import { useState, useEffect } from 'react'
import { Plus, Check, Trash2, Banknote, ChevronDown, ChevronUp } from 'lucide-react'
import { Button }        from '@/components/ui/button'
import { Input }         from '@/components/ui/input'
import { SelectNative }  from '@/components/ui/select-native'
import { Label }         from '@/components/ui/label'
import { FormMessage }   from '@/components/ui/form-message'
import { StatusBadge }   from '@/components/ui/badge'

interface Department { id: string; name: string }
interface Employee   { id: string; name: string; hourlyRate: number; employmentType: string; department: Department }
interface Payroll {
  id: string; month: number; year: number; status: string
  regularHours: number; overtimeHours: number; hourlyRate: number
  grossPay: number; expensesTotal: number; deductions: number; netPay: number
  salaryAmount: number; perDiemTotal: number; mileageTotal: number
  notes: string | null; processedAt: string | null; paidAt: string | null; employee: Employee
}

const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const STATUS_LABEL: Record<string, string> = { DRAFT: 'Rascunho', PROCESSED: 'Processado', PAID: 'Pago' }

export default function PayrollManager() {
  const now = new Date()
  const [payrolls,    setPayrolls]    = useState<Payroll[]>([])
  const [employees,   setEmployees]   = useState<Employee[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1))
  const [filterYear,  setFilterYear]  = useState(String(now.getFullYear()))
  const [creating,    setCreating]    = useState(false)
  const [form,        setForm]        = useState({ employeeId: '', month: String(now.getMonth() + 1), year: String(now.getFullYear()), deductions: '0', notes: '' })
  const [saving,      setSaving]      = useState(false)
  const [message,     setMessage]     = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [expanded,    setExpanded]    = useState<string | null>(null)

  function showMsg(type: 'success' | 'error', text: string) { setMessage({ type, text }); setTimeout(() => setMessage(null), 3000) }

  function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterMonth) params.set('month', filterMonth)
    if (filterYear)  params.set('year',  filterYear)
    fetch(`/api/admin/payroll?${params}`).then(r => r.json()).then(data => { setPayrolls(data); setLoading(false) })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [filterMonth, filterYear])
  useEffect(() => { fetch('/api/admin/employees').then(r => r.json()).then(setEmployees) }, [])

  async function handleCreate() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/payroll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: form.employeeId, month: parseInt(form.month), year: parseInt(form.year), deductions: parseFloat(form.deductions) || 0, notes: form.notes || null }) })
      const data = await res.json()
      if (!res.ok) { showMsg('error', data.error ?? 'Erro ao processar.'); return }
      setPayrolls(prev => [data, ...prev]); setCreating(false); showMsg('success', 'Payroll calculado!')
    } catch { showMsg('error', 'Erro ao processar.') } finally { setSaving(false) }
  }

  async function handleStatus(id: string, status: string) {
    const res = await fetch('/api/admin/payroll', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    if (res.ok) { const saved = await res.json(); setPayrolls(prev => prev.map(p => p.id === id ? saved : p)); showMsg('success', status === 'PAID' ? 'Marcado como pago!' : 'Estado actualizado.') }
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminar este registo de payroll?')) return
    const res = await fetch(`/api/admin/payroll?id=${id}`, { method: 'DELETE' })
    if (res.ok) { setPayrolls(prev => prev.filter(p => p.id !== id)); showMsg('success', 'Eliminado.') }
    else { const data = await res.json(); showMsg('error', data.error ?? 'Erro.') }
  }

  const totalNet = payrolls.reduce((s, p) => s + Number(p.netPay), 0)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3">
        <div className="flex gap-2 items-center flex-wrap">
          <SelectNative value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-auto">
            {months.map((m, i) => <option key={i + 1} value={String(i + 1)}>{m}</option>)}
          </SelectNative>
          <SelectNative value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-auto">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={String(y)}>{y}</option>)}
          </SelectNative>
          <span className="text-sm text-zinc-500">
            {payrolls.length} registo(s) · Total líquido: <strong className="text-zinc-300">€{totalNet.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</strong>
          </span>
        </div>
        <Button onClick={() => setCreating(c => !c)} className="shrink-0">
          <Plus size={15} /> Processar Payroll
        </Button>
      </div>

      {message && <FormMessage type={message.type}>{message.text}</FormMessage>}

      {creating && (
        <div className="bg-secondary/30 border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-zinc-200 mb-1">Processar Payroll</h3>
          <p className="text-xs text-zinc-500 mb-3">Para colaboradores internos, o sistema soma salário mensal, per diems e quilómetros da timesheet aprovada. As despesas seguem um fluxo separado.</p>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div>
              <Label>Funcionário *</Label>
              <SelectNative className="mt-1" value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}>
                <option value="">— Seleccionar —</option>
                {employees.filter(e => e.employmentType === 'INTERNAL').map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </SelectNative>
            </div>
            <div>
              <Label>Mês</Label>
              <SelectNative className="mt-1" value={form.month} onChange={e => setForm(p => ({ ...p, month: e.target.value }))}>
                {months.map((m, i) => <option key={i + 1} value={String(i + 1)}>{m}</option>)}
              </SelectNative>
            </div>
            <div>
              <Label>Ano</Label>
              <Input className="mt-1" type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} />
            </div>
            <div>
              <Label>Deduções (€)</Label>
              <Input className="mt-1" type="number" step="0.01" value={form.deductions} onChange={e => setForm(p => ({ ...p, deductions: e.target.value }))} />
            </div>
          </div>
          <div className="mb-3">
            <Label>Notas</Label>
            <Input className="mt-1" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <Button disabled={saving || !form.employeeId} onClick={handleCreate}>
              <Check size={14} /> {saving ? 'A processar...' : 'Processar'}
            </Button>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button>
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
                <th className="w-8 px-3 py-3"></th>
                {['Funcionário','Departamento','Período','Horas','Bruto','Deduções','Líquido','Estado',''].map((h, i) => (
                  <th key={i} className={`${[4,5,6].includes(i) ? 'text-right' : 'text-left'} px-3 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payrolls.map(p => (
                <>
                  <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-3 py-3">
                      <Button variant="ghost" size="icon" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
                        {expanded === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </Button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <Banknote size={14} className="text-zinc-600 shrink-0" />
                        <span className="font-medium text-zinc-200">{p.employee.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-zinc-400">{p.employee.department.name}</td>
                    <td className="px-3 py-3 text-zinc-400">{months[p.month - 1]} {p.year}</td>
                    <td className="px-3 py-3 text-right text-zinc-400">
                      {Number(p.regularHours).toFixed(1)}h
                      {Number(p.overtimeHours) > 0 && <span className="text-xs text-amber-500 ml-1">+{Number(p.overtimeHours).toFixed(1)}h</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-zinc-400">€{Number(p.grossPay).toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-zinc-400">€{Number(p.deductions).toFixed(2)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-zinc-200">€{Number(p.netPay).toFixed(2)}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={p.status} label={STATUS_LABEL[p.status]} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        {p.status === 'DRAFT' && (
                          <button onClick={() => handleStatus(p.id, 'PROCESSED')} className="text-xs px-2 py-1 bg-blue-950 text-blue-400 border border-blue-800/30 rounded hover:bg-blue-900 transition-colors">Processar</button>
                        )}
                        {p.status === 'PROCESSED' && (
                          <button onClick={() => handleStatus(p.id, 'PAID')} className="text-xs px-2 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800/30 rounded hover:bg-emerald-900 transition-colors">Pago</button>
                        )}
                        {p.status !== 'PAID' && (
                          <Button variant="ghost" size="icon" className="hover:text-red-400" onClick={() => handleDelete(p.id)}>
                            <Trash2 size={13} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expanded === p.id && (
                    <tr key={`exp-${p.id}`} className="bg-secondary/20">
                      <td colSpan={10} className="px-8 py-3">
                        <div className="grid grid-cols-5 gap-4 text-xs text-zinc-400">
                          <div><span className="font-medium text-zinc-300">Salário mensal:</span> €{Number(p.salaryAmount).toFixed(2)}</div>
                          <div><span className="font-medium text-zinc-300">Horas normais:</span> {Number(p.regularHours).toFixed(2)}h</div>
                          <div><span className="font-medium text-zinc-300">Horas extra:</span> {Number(p.overtimeHours).toFixed(2)}h (×1.5)</div>
                          <div><span className="font-medium text-zinc-300">Per diems:</span> €{Number(p.perDiemTotal).toFixed(2)}</div>
                          <div><span className="font-medium text-zinc-300">Quilómetros:</span> €{Number(p.mileageTotal).toFixed(2)}</div>
                          <div><span className="font-medium text-zinc-300">Deduções:</span> €{Number(p.deductions).toFixed(2)}</div>
                          {p.notes  && <div className="col-span-5"><span className="font-medium text-zinc-300">Notas:</span> {p.notes}</div>}
                          {p.paidAt && <div className="col-span-5"><span className="font-medium text-zinc-300">Pago em:</span> {new Date(p.paidAt).toLocaleDateString('pt-PT')}</div>}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          {payrolls.length === 0 && <div className="text-center py-12 text-zinc-600 text-sm">Sem registos de payroll para este período.</div>}
        </div>
      )}
    </div>
  )
}
