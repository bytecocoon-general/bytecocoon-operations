'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Clock, CheckSquare, FolderKanban, Users,
  Building2, Receipt, Banknote, BarChart3, UserCog, CreditCard, UserPlus,
} from 'lucide-react'

type NavItem =
  | { href: string; label: string; icon: React.ElementType; roles: string[] }
  | { divider: true; label: string; roles: string[] }

const navItems: NavItem[] = [
  // ── Pessoal ───────────────────────────────────────────────────────────────
  { divider: true, label: 'Pessoal', roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
  { href: '/dashboard',           label: 'Dashboard',          icon: LayoutDashboard, roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
  { href: '/dashboard/timesheet', label: 'A Minha Timesheet',  icon: Clock,           roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },
  { href: '/dashboard/expenses',  label: 'As Minhas Despesas', icon: CreditCard,      roles: ['EMPLOYEE', 'MANAGER', 'ADMIN'] },

  // ── Gestão ────────────────────────────────────────────────────────────────
  { divider: true, label: 'Gestão', roles: ['MANAGER', 'ADMIN'] },
  { href: '/dashboard/approvals', label: 'Aprovações',    icon: CheckSquare,  roles: ['MANAGER', 'ADMIN'] },
  { href: '/dashboard/projects',  label: 'Projectos',     icon: FolderKanban, roles: ['MANAGER', 'ADMIN'] },
  { href: '/dashboard/employees', label: 'Colaboradores', icon: Users,        roles: ['MANAGER', 'ADMIN'] },
  { href: '/dashboard/clients',   label: 'Clientes',      icon: Building2,    roles: ['MANAGER', 'ADMIN'] },
  { href: '/dashboard/staffing',  label: 'Staffing',      icon: UserCog,      roles: ['MANAGER', 'ADMIN'] },
  { href: '/dashboard/registrations', label: 'Registos', icon: UserPlus, roles: ['ADMIN'] },

  // ── Operações ─────────────────────────────────────────────────────────────
  { divider: true, label: 'Operações', roles: ['ADMIN'] },
  { href: '/dashboard/payroll',   label: 'Payroll',    icon: Banknote,  roles: ['ADMIN'] },
  { href: '/dashboard/invoices',  label: 'Faturas',    icon: Receipt,   roles: ['ADMIN'] },
  { href: '/dashboard/reports',   label: 'Relatórios', icon: BarChart3, roles: ['ADMIN'] },
]

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname()
  const visible  = navItems.filter(item => item.roles.includes(role))

  return (
    <aside className="w-60 min-h-screen bg-card border-r border-border flex flex-col shrink-0">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">C</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-none">Cocoon Ops</p>
            <p className="text-xs text-muted-foreground mt-0.5">Operations Platform</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {visible.map((item, idx) => {
          if ('divider' in item) {
            return (
              <div key={`div-${idx}`} className="pt-5 pb-1.5 px-2 first:pt-2">
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">{item.label}</p>
              </div>
            )
          }
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all mt-0.5 ${
                active
                  ? 'bg-violet-600/15 text-violet-600 dark:text-violet-300 border border-violet-500/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent'
              }`}
            >
              <item.icon size={16} className={active ? 'text-violet-500 dark:text-violet-400' : ''} />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
