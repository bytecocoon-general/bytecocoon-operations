import EmployeesManager from '@/components/admin/EmployeesManager'

export default function EmployeesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Funcionários</h1>
        <p className="text-zinc-500 mt-1">Gere os funcionários, departamentos e valores/hora.</p>
      </div>
      <EmployeesManager />
    </div>
  )
}