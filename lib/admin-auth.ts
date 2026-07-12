import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function requireAdmin() {
  const { userId } = await auth()
  if (!userId) return null
  return db.employee.findFirst({
    where: { clerkId: userId, role: 'ADMIN', accessStatus: 'APPROVED' },
  })
}
