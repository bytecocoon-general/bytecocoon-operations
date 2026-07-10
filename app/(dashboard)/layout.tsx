import { auth, currentUser } from '@clerk/nextjs/server'
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

  let employee = await db.employee.findUnique({ where: { clerkId: userId } })

  // Salvaguarda: criar Employee se não existir
  if (!employee) {
    const user = await currentUser()
    const email = user?.emailAddresses[0]?.emailAddress
    if (!email) redirect('/sign-in')

    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || email

    const defaultDept = await db.department.upsert({
      where:  { name: 'Por Definir' },
      update: {},
      create: { name: 'Por Definir' },
    })

    employee = await db.employee.create({
      data: {
        clerkId:      userId,
        name:         fullName,
        email:        email,
        hourlyRate:   0,
        role:         'EMPLOYEE',
        departmentId: defaultDept.id,
      },
    })
  }

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