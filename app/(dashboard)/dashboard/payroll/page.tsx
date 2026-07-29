import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import PayrollManager from '@/components/admin/PayrollManager'

export default async function PayrollPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const employee = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!employee || employee.role !== 'ADMIN') redirect('/dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Custos Mensais</h1>
        <p className="text-sm text-zinc-500 mt-1">Registo do valor gasto por colaborador, interno ou externo</p>
      </div>
      <PayrollManager />
    </div>
  )
}
