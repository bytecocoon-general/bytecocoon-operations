/**
 * GET /api/employees/delegatable
 *
 * Lista de colaboradores em cujo nome o utilizador autenticado pode
 * introduzir/editar timesheets: ADMIN -> todos os activos; MANAGER ->
 * ele próprio + a sua equipa directa (managerId); EMPLOYEE -> só ele próprio.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentEmployee } from '@/lib/auth'

export async function GET() {
  const actor = await getCurrentEmployee()
  if (!actor) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (actor.role === 'ADMIN') {
    const employees = await db.employee.findMany({
      where:   { isActive: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(employees)
  }

  if (actor.role === 'MANAGER') {
    const reports = await db.employee.findMany({
      where:   { isActive: true, managerId: actor.id },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json([{ id: actor.id, name: actor.name }, ...reports])
  }

  return NextResponse.json([{ id: actor.id, name: actor.name }])
}
