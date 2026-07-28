export type CompensationType = 'HOURLY' | 'DAILY' | 'MONTHLY'

export interface CompensationLine {
  date: Date | string
  projectId?: string | null
  type: string
  hours: unknown
  extraHours: unknown
  overtimeMultiplier?: unknown
  perDiemAmount?: unknown
}

function number(value: unknown): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function dayKey(date: Date | string): string {
  return date instanceof Date ? date.toISOString().substring(0, 10) : String(date).substring(0, 10)
}

function workHours(line: CompensationLine): number {
  return number(line.hours) + number(line.extraHours)
}

export function calculateBaseCompensation(type: CompensationType, amount: number, lines: CompensationLine[]): number {
  const workLines = lines.filter(line => line.type === 'WORK' && workHours(line) > 0)
  if (type === 'MONTHLY') return amount
  if (type === 'DAILY') return new Set(workLines.map(line => dayKey(line.date))).size * amount

  return workLines.reduce((total, line) => {
    const multiplier = line.overtimeMultiplier != null ? number(line.overtimeMultiplier) : 1.5
    return total + number(line.hours) * amount + number(line.extraHours) * amount * multiplier
  }, 0)
}

export function allocateCompensationByProject(
  type: CompensationType,
  amount: number,
  travelDayRate: number,
  lines: CompensationLine[],
): Record<string, number> {
  const result: Record<string, number> = {}
  const add = (projectId: string | null | undefined, value: number) => {
    if (!projectId || value === 0) return
    result[projectId] = (result[projectId] ?? 0) + value
  }
  const workLines = lines.filter(line => line.type === 'WORK' && workHours(line) > 0)

  if (type === 'HOURLY') {
    for (const line of workLines) {
      const multiplier = line.overtimeMultiplier != null ? number(line.overtimeMultiplier) : 1.5
      add(line.projectId, number(line.hours) * amount + number(line.extraHours) * amount * multiplier)
    }
  } else if (type === 'DAILY') {
    const byDay = new Map<string, CompensationLine[]>()
    for (const line of workLines) byDay.set(dayKey(line.date), [...(byDay.get(dayKey(line.date)) ?? []), line])
    for (const dayLines of Array.from(byDay.values())) {
      const totalHours = dayLines.reduce((sum, line) => sum + workHours(line), 0)
      for (const line of dayLines) add(line.projectId, amount * workHours(line) / totalHours)
    }
  } else {
    const totalHours = workLines.reduce((sum, line) => sum + workHours(line), 0)
    if (totalHours > 0) for (const line of workLines) add(line.projectId, amount * workHours(line) / totalHours)
  }

  if (travelDayRate > 0) {
    const byDay = new Map<string, CompensationLine[]>()
    for (const line of workLines) byDay.set(dayKey(line.date), [...(byDay.get(dayKey(line.date)) ?? []), line])
    for (const dayLines of Array.from(byDay.values())) {
      const totalHours = dayLines.reduce((sum, line) => sum + workHours(line), 0)
      for (const line of dayLines) add(line.projectId, travelDayRate * workHours(line) / totalHours)
    }
  }

  for (const line of lines) add(line.projectId, number(line.perDiemAmount))
  return result
}
