import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import InvoicesManager from '@/components/admin/InvoicesManager'

export default async function InvoicesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const employee = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!employee || (employee.role !== 'ADMIN' && employee.role !== 'MANAGER')) redirect('/dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Faturas</h1>
        <p className="text-sm text-zinc-500 mt-1">Gestão de faturas e faturação a clientes</p>
      </div>
      <InvoicesManager />
    </div>
  )
}
