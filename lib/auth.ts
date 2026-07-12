import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import type { Employee } from '@prisma/client'

export async function getCurrentEmployee(): Promise<Employee | null> {
  const { userId } = await auth()
  if (!userId) return null
  return db.employee.findUnique({ where: { clerkId: userId } })
}

// ADMIN pode agir em nome de qualquer colaborador; MANAGER só da sua equipa
// (managerId === actor.id); qualquer colaborador pode sempre agir em nome próprio.
export function canActOnBehalfOf(
  actor:  { id: string; role: string },
  target: { id: string; managerId: string | null }
): boolean {
  if (actor.id === target.id) return true
  if (actor.role === 'ADMIN') return true
  if (actor.role === 'MANAGER') return target.managerId === actor.id
  return false
}
