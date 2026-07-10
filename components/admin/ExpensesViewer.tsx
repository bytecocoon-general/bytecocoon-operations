'use client'

import { useState, useEffect } from 'react'
import { Receipt } from 'lucide-react'
import { SelectNative } from '@/components/ui/select-native'
import { StatusBadge }  from '@/components/ui/badge'

interface Expense {
  id: string; date: string; category: string; amount: number
  description: string | null; receiptUrl: string | null
  timesheet: { month: number; year: number; status: string; employee: { id: string; name: string } }
}

const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const TS_LABEL: Record<string, string> = { DRAFT: 'Rascunho', SUBMITTED: 'Submetido', APPROVED: 'Aprovado', REJECTED: 'Rejeitado' }

export default function ExpensesViewer() {
  const now = new Date()
  const [expenses,    setExpenses]    = useState<Expense[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1))
  const [filterYear,  setFilterYear]  = useState(String(now.getFullYear()))

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterMonth) params.set('month', filterMonth)
    if (filterYear)  params.set('year',  filterYear)
    fetch(`/api/admin/expenses?${params}`).then(r => r.json()).then(data => { setExpenses(data); setLoading(false) })
  }, [filterMonth, filterYear])

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const byCategory = expenses.reduce((acc, e) => { acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount); return acc }, {} as Record<string, number>)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-3">
        <div className="flex gap-2 items-center">
          <SelectNative value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-auto">
            {months.map((m, i) => <option key={i + 1} value={String(i + 1)}>{m}</option>)}
          </SelectNative>
          <SelectNative value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-auto">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={String(y)}>{y}</option>)}
          </SelectNative>
          <span className="text-sm text-zinc-500">{expenses.length} despesa(s) · Total: <strong className="text-zinc-300">€{total.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</strong></span>
        </div>
      </div>

      {Object.keys(byCategory).length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
            <div key={cat} className="bg-card rounded-xl border border-border p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">{cat}</p>
              <p className="text-lg font-semibold text-zinc-100 mt-1">€{amt.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-zinc-600">A carregar...</div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-card border-b border-border">
              <tr>
                {['Data','Funcionário','Categoria','Descrição','Estado TS','Valor'].map((h, i) => (
                  <th key={i} className={`${i === 5 ? 'text-right px-5' : i === 0 ? 'text-left px-5' : 'text-left px-3'} py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {expenses.map(e => (
                <tr key={e.id} className="hover:bg-secondary/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Receipt size={14} className="text-zinc-600 shrink-0" />
                      <span className="text-zinc-300">{e.date.slice(0, 10)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-zinc-400">{e.timesheet.employee.name}</td>
                  <td className="px-3 py-3 text-zinc-400">{e.category}</td>
                  <td className="px-3 py-3 text-zinc-500">{e.description ?? '—'}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={e.timesheet.status} label={TS_LABEL[e.timesheet.status]} />
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-zinc-200">€{Number(e.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {expenses.length === 0 && <div className="text-center py-12 text-zinc-600 text-sm">Sem despesas para este período.</div>}
        </div>
      )}
    </div>
  )
}
