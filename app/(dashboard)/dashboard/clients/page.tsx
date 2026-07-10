import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import ClientsManager from '@/components/admin/ClientsManager'

export default async function ClientsPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const employee = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!employee || (employee.role !== 'ADMIN' && employee.role !== 'MANAGER')) redirect('/dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Clientes</h1>
        <p className="text-sm text-zinc-500 mt-1">Gestão de clientes e entidades externas</p>
      </div>
      <ClientsManager />
    </div>
  )
}
