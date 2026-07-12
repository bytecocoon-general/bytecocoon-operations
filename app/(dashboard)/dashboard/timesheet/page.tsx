import { getCurrentEmployee } from '@/lib/auth'
import { redirect } from 'next/navigation'
import TimesheetPageClient from '@/components/timesheet/TimesheetPageClient'

export default async function TimesheetPage() {
  const employee = await getCurrentEmployee()
  if (!employee) redirect('/sign-in')

  const canDelegate = employee.role === 'ADMIN' || employee.role === 'MANAGER'

  return <TimesheetPageClient canDelegate={canDelegate} selfId={employee.id} />
}
