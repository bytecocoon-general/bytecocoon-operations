'use client'

import { useState, useEffect } from 'react'
import { FolderKanban } from 'lucide-react'

interface ProjectFinancials {
  id:                 string
  name:               string
  clientName:         string | null
  invoiced:           number
  expenses:           number
  laborCost:          number
  spent:              number
  margin:             number
  budget:             number | null
  remainingToInvoice: number | null
}

function money(n: number): string {
  return n.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })
}

export default function ProjectFinancialsTable() {
  const [rows,    setRows]    = useState<ProjectFinancials[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/reports/project-financials')
      .then(r => r.json())
      .then(data => { setRows(data); setLoading(false) })
  }, [])

  if (loading) return <div className="text-center py-16 text-zinc-600">A carregar...</div>

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-card border-b border-border">
          <tr>
            {['Projecto','Cliente','Facturado','Despesas','Mão-de-obra','Gasto total','Margem','Orçamento','Falta facturar'].map((h, i) => (
              <th key={i} className={`${i === 0 ? 'text-left px-5' : 'text-right px-3'} py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide whitespace-nowrap`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(p => (
            <tr key={p.id} className="hover:bg-secondary/30 transition-colors">
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <FolderKanban size={14} className="text-zinc-600 shrink-0" />
                  <span className="font-medium text-zinc-200">{p.name}</span>
                </div>
              </td>
              <td className="px-3 py-3 text-right text-zinc-400">{p.clientName ?? '—'}</td>
              <td className="px-3 py-3 text-right text-zinc-300">{money(p.invoiced)}</td>
              <td className="px-3 py-3 text-right text-zinc-400">{money(p.expenses)}</td>
              <td className="px-3 py-3 text-right text-zinc-400">{money(p.laborCost)}</td>
              <td className="px-3 py-3 text-right text-zinc-300">{money(p.spent)}</td>
              <td className={`px-3 py-3 text-right font-medium ${p.margin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{money(p.margin)}</td>
              <td className="px-3 py-3 text-right text-zinc-400">{p.budget != null ? money(p.budget) : '—'}</td>
              <td className="px-3 py-3 text-right text-zinc-400">{p.remainingToInvoice != null ? money(p.remainingToInvoice) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="text-center py-12 text-zinc-600 text-sm">Sem projectos.</div>}
    </div>
  )
}
