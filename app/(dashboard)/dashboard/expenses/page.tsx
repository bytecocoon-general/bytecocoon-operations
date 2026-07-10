import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import ExpensesManager from '@/components/expenses/ExpensesManager'

export default async function ExpensesPage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const employee = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!employee) redirect('/dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">As Minhas Despesas</h1>
        <p className="text-sm text-zinc-500 mt-1">Registe e acompanhe as suas despesas profissionais.</p>
      </div>
      <ExpensesManager />
    </div>
  )
}
