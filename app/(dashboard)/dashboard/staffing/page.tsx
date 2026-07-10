'use client'

import { useState } from 'react'
import StaffingManager from '@/components/staffing/StaffingManager'
import SkillsManager from '@/components/staffing/SkillsManager'
import { Users, Zap } from 'lucide-react'

const TABS = [
  { id: 'staffing', label: 'Equipas & Projectos', icon: Users },
  { id: 'skills',   label: 'Skills & Competências', icon: Zap  },
] as const

type TabId = typeof TABS[number]['id']

export default function StaffingPage() {
  const [active, setActive] = useState<TabId>('staffing')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Staffing</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gere equipas, autorizações, competências técnicas e alocações por projecto
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-secondary rounded-xl w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={[
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {active === 'staffing' && <StaffingManager />}
      {active === 'skills'   && <SkillsManager />}
    </div>
  )
}
