'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import ApprovalList        from '@/components/approvals/ApprovalList'
import ExpenseApprovalList from '@/components/approvals/ExpenseApprovalList'

type Tab = 'timesheets' | 'despesas'

export default function ApprovalsPage() {
  const [tab,              setTab]              = useState<Tab>('timesheets')
  const [tsCount,          setTsCount]          = useState(0)
  const [expCount,         setExpCount]         = useState(0)

  // Load pending counts for tab badges on mount
  useEffect(() => {
    fetch('/api/admin/timesheets?status=SUBMITTED')
      .then(r => r.json())
      .then(d => Array.isArray(d) && setTsCount(d.length))
      .catch(() => {})

    fetch('/api/admin/expenses?status=SUBMITTED')
      .then(r => r.json())
      .then(d => Array.isArray(d) && setExpCount(d.length))
      .catch(() => {})
  }, [])

  const handleTsCount  = useCallback((n: number) => setTsCount(n),  [])
  const handleExpCount = useCallback((n: number) => setExpCount(n), [])

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Aprovações</h1>
        <p className="text-zinc-500 mt-1">Revê e aprova os pedidos submetidos pela equipa.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { id: 'timesheets', label: 'Timesheets', count: tsCount  },
          { id: 'despesas',   label: 'Despesas',   count: expCount },
        ] as { id: Tab; label: string; count: number }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
              tab === t.id
                ? 'border-violet-500 text-violet-300'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            )}
          >
            {t.label}
            {t.count > 0 && (
              <span className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center leading-none',
                tab === t.id
                  ? 'bg-violet-600/30 text-violet-300'
                  : 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'timesheets' ? (
        <ApprovalList onCountChange={handleTsCount} />
      ) : (
        <ExpenseApprovalList onCountChange={handleExpCount} />
      )}
    </div>
  )
}
