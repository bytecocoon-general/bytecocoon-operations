import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

function getCurrentMonth() {
  return new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const employee = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!employee || employee.accessStatus !== 'APPROVED' || !employee.isActive) redirect('/registration-status')

  const month = getCurrentMonth()

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={employee.role} />
      <div className="flex-1 flex flex-col">
        <Header name={employee.name} role={employee.role} month={month} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
