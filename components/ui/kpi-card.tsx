import * as React from 'react'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Tone system ─────────────────────────────────────────────────────────────
// Each tone maps to the 950/800/400 accent ramp used throughout the app.

export type KpiTone = 'emerald' | 'violet' | 'orange' | 'blue' | 'amber' | 'red' | 'zinc'

const toneChip: Record<KpiTone, string> = {
  emerald: 'bg-emerald-950 border-emerald-800/30 text-emerald-400',
  violet:  'bg-violet-950  border-violet-800/30  text-violet-400',
  orange:  'bg-orange-950  border-orange-800/30  text-orange-400',
  blue:    'bg-blue-950    border-blue-800/30    text-blue-400',
  amber:   'bg-amber-950   border-amber-800/30   text-amber-400',
  red:     'bg-red-950     border-red-800/30     text-red-400',
  zinc:    'bg-zinc-800    border-zinc-700        text-zinc-400',
}

// ── KpiCard ─────────────────────────────────────────────────────────────────

export interface KpiCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Accent colour for the icon chip. */
  tone: KpiTone
  /** Lucide icon component (pass the class, not a rendered element). */
  icon: LucideIcon
  /** Primary value — large bold number/text. */
  value: string
  /** Smaller label below the value. */
  label: string
  /** Optional badge / tag shown top-right (e.g. year label, pending pill). */
  meta?: React.ReactNode
}

export function KpiCard({ tone, icon: Icon, value, label, meta, className, ...props }: KpiCardProps) {
  return (
    <div className={cn('bg-card rounded-xl border border-border p-5', className)} {...props}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-2 rounded-lg border', toneChip[tone])}>
          <Icon size={18} />
        </div>
        {meta && <div className="flex items-center">{meta}</div>}
      </div>
      <p className="text-2xl font-bold text-zinc-100">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  )
}

// ── KpiMiniCard ─────────────────────────────────────────────────────────────
// Horizontal card: icon chip left, label + value right.
// Used in the "As Minhas Timesheets" row on the Dashboard.

export interface KpiMiniCardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone: KpiTone
  icon: LucideIcon
  label: string
  value: React.ReactNode
}

export function KpiMiniCard({ tone, icon: Icon, label, value, className, ...props }: KpiMiniCardProps) {
  return (
    <div className={cn('bg-card rounded-xl border border-border p-5 flex items-center gap-4', className)} {...props}>
      <div className={cn('p-2.5 rounded-lg border shrink-0', toneChip[tone])}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-base font-semibold text-zinc-100 mt-0.5">{value}</p>
      </div>
    </div>
  )
}
