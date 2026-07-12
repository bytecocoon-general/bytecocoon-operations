/**
 * GET /api/my-project-permissions
 *
 * Returns a map of projectId → ProjectMember config for the target employee
 * (the current employee by default, or another one via ?employeeId=,
 * when the caller is allowed to act on that employee's behalf).
 * Used by TimesheetGrid to know which fields to show per project line.
 *
 * If the employee has no ProjectMember entry for a project,
 * overtime/on-call/expenses are all forbidden (default-deny).
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentEmployee, canActOnBehalfOf } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const actor = await getCurrentEmployee()
  if (!actor) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const requestedEmployeeId = new URL(req.url).searchParams.get('employeeId') ?? undefined
  let targetId = actor.id

  if (requestedEmployeeId && requestedEmployeeId !== actor.id) {
    const target = await db.employee.findUnique({ where: { id: requestedEmployeeId } })
    if (!target) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    if (!canActOnBehalfOf(actor, target)) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    targetId = target.id
  }

  const memberships = await db.projectMember.findMany({
    where: { employeeId: targetId },
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
