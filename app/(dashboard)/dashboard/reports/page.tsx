import { BarChart3 } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Relatórios</h1>
        <p className="text-sm text-muted-foreground mt-1">Análises e exportações de dados operacionais.</p>
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="px-6 py-16 flex flex-col items-center justify-center text-center gap-4">
          <div className="p-4 rounded-2xl bg-violet-950 border border-violet-800/30">
            <BarChart3 size={28} className="text-violet-400" />
          </div>
          <div>
            <p className="font-semibold text-zinc-100">Relatórios em breve</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Esta secção irá incluir análises de faturação, ocupação de consultores, margens por projecto e exportações para Excel / PDF.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
