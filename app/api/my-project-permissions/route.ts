/**
 * GET /api/my-project-permissions
 *
 * Returns a map of projectId → ProjectMember config for the current employee.
 * Used by TimesheetGrid to know which fields to show per project line.
 *
 * If the employee has no ProjectMember entry for a project,
 * overtime/on-call/expenses are all forbidden (default-deny).
 */
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const employee = await db.employee.findUnique({ where: { clerkId: userId } })
  if (!employee) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

  const memberships = await db.projectMember.findMany({
    where: { employeeId: employee.id },
    select: {
      projectId:                  true,
      overtimeAllowed:            true,
      overtimeWeekdayMultiplier:  true,
      overtimeWeekendMultiplier:  true,
      onCallAllowed:              true,
      onCallWeeklyRate:           true,
      expensesAllowed:            true,
      expensesMonthlyLimit:       true,
    },
  })

  // Return as a map keyed by projectId for O(1) lookup in the UI
  const map: Record<string, typeof memberships[0]> = {}
  for (const m of memberships) {
    map[m.projectId] = m
  }

  return NextResponse.json(map)
}
