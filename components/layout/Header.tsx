import { UserButton } from '@clerk/nextjs'
import { Bell } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

interface HeaderProps { name: string; role: string; month: string }

const roleLabel: Record<string, string> = {
  EMPLOYEE: 'Colaborador',
  MANAGER:  'Gestor',
  ADMIN:    'Administrador',
}

export default function Header({ name, role, month }: HeaderProps) {
  return (
    <header className="h-14 bg-card/80 backdrop-blur border-b border-border px-6 flex items-center justify-between shrink-0">
      <p className="text-sm text-muted-foreground capitalize">{month}</p>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors">
          <Bell size={17} />
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <p className="text-sm font-medium text-foreground leading-none">{name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{roleLabel[role] ?? role}</p>
          </div>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>
    </header>
  )
}
