import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border',
  {
    variants: {
      variant: {
        default:  'bg-zinc-800  text-zinc-400  border-zinc-700',
        blue:     'bg-blue-950  text-blue-400  border-blue-800/30',
        emerald:  'bg-emerald-950 text-emerald-400 border-emerald-800/30',
        amber:    'bg-amber-950 text-amber-400  border-amber-800/30',
        red:      'bg-red-950   text-red-400    border-red-800/30',
        violet:   'bg-violet-950 text-violet-400 border-violet-800/30',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

// ── Status → variant map ────────────────────────────────────────────────────
// Single source of truth for status colours across the whole app.
type BadgeVariant = NonNullable<BadgeProps['variant']>

const statusVariantMap: Record<string, BadgeVariant> = {
  // Timesheet / Expense
  DRAFT:      'default',
  SUBMITTED:  'amber',
  APPROVED:   'emerald',
  REJECTED:   'red',
  // Payroll
  PROCESSED:  'blue',
  PAID:       'emerald',
  // Contract
  ACTIVE:     'emerald',
  EXPIRED:    'amber',
  TERMINATED: 'red',
  // Invoice
  SENT:       'blue',
  OVERDUE:    'red',
  CANCELLED:  'default',
  // Employee role
  EMPLOYEE:   'default',
  MANAGER:    'blue',
  ADMIN:      'violet',
}

interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: string
  /** Optional label override — useful when the text needs a specific gender form in Portuguese. */
  label?: string
}

const defaultLabel: Record<string, string> = {
  DRAFT: 'Rascunho', SUBMITTED: 'Submetido', APPROVED: 'Aprovado', REJECTED: 'Rejeitado',
  PROCESSED: 'Processado', PAID: 'Pago',
  ACTIVE: 'Activo', EXPIRED: 'Expirado', TERMINATED: 'Terminado',
  SENT: 'Enviada', OVERDUE: 'Em Atraso', CANCELLED: 'Cancelada',
  EMPLOYEE: 'Colaborador', MANAGER: 'Gestor', ADMIN: 'Administrador',
}

function StatusBadge({ status, label, className, ...props }: StatusBadgeProps) {
  return (
    <Badge
      variant={statusVariantMap[status] ?? 'default'}
      className={className}
      {...props}
    >
      {label ?? defaultLabel[status] ?? status}
    </Badge>
  )
}

export { Badge, StatusBadge, badgeVariants }
