'use client'

import { useState, useEffect } from 'react'
import { SelectNative } from '@/components/ui/select-native'
import TimesheetGrid from './TimesheetGrid'

interface DelegatableEmployee { id: string; name: string }

export default function TimesheetPageClient({ canDelegate, selfId }: { canDelegate: boolean; selfId: string }) {
  const [employees,  setEmployees]  = useState<DelegatableEmployee[]>([])
  const [employeeId, setEmployeeId] = useState(selfId)

  useEffect(() => {
    if (!canDelegate) return
    fetch('/api/employees/delegatable').then(r => r.json()).then(setEmployees)
  }, [canDelegate])

  const isSelf   = employeeId === selfId
  const selected = employees.find(e => e.id === employeeId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {isSelf ? 'A Minha Timesheet' : `Timesheet de ${selected?.name ?? ''}`}
          </h1>
          <p className="text-zinc-500 mt-1">Regista horas, deslocações internacionais e quilometragem do mês.</p>
        </div>
        {canDelegate && employees.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">A editar timesheet de</label>
            <SelectNative value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="text-sm rounded px-2 py-1.5">
              {employees.map(e => <option key={e.id} value={e.id}>{e.id === selfId ? 'Eu' : e.name}</option>)}
            </SelectNative>
          </div>
        )}
      </div>
      <TimesheetGrid employeeId={isSelf ? undefined : employeeId} />
    </div>
  )
}
