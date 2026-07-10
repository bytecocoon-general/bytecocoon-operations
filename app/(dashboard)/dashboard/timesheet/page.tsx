import TimesheetGrid from '@/components/timesheet/TimesheetGrid'

export default function TimesheetPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">A Minha Timesheet</h1>
        <p className="text-zinc-500 mt-1">Regista as tuas horas trabalhadas por dia e projecto.</p>
      </div>
      <TimesheetGrid />
    </div>
  )
}