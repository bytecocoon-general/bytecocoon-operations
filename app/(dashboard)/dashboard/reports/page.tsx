import ProjectFinancialsTable from '@/components/reports/ProjectFinancialsTable'

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Relatórios</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Facturado, gasto e margem por projecto, a partir de facturas emitidas, despesas aprovadas e timesheets aprovadas.
        </p>
      </div>

      <ProjectFinancialsTable />

      <p className="text-xs text-muted-foreground/70 px-1">
        Ocupação de consultores e previsão de custos futuros (ex: prémios, viagens previstas) ficam para uma próxima iteração.
      </p>
    </div>
  )
}
