/**
 * Parser for the Halian / ACTIUM-IO timesheet format.
 *
 * Recognised by the presence of a "Halian TS" sheet.
 *
 * Sheet layout ("Halian TS"):
 *   Row  6 (idx 5):  Consultant name in col B (idx 1)
 *   Row  7 (idx 6):  Month as Excel serial in col I (idx 8)
 *   Row 14 (idx 13): Project names, one per 3 columns starting at col C (idx 2)
 *                    format: "PO_NUMBER!Project Title"
 *                    (unused project slots are blank — there can be up to 6 projects)
 *   Row 15 (idx 14): Rate multipliers per project (1 | 1.5 | 2) then admin column labels:
 *                    Travel | Holidays | Sickness | Recup | Training | Team
 *   Rows 16+:        One row per calendar day until a row with col A = "TOTAL"
 *                    Col A: Excel date serial
 *                    Col B: Day name ("Mon", "Tue", …, "Sat", "Sun")
 *                    Col C+: hours (Excel time fraction — multiply × 24 for real hours)
 *
 * Hours are stored as Excel time fractions (0.3333… = 8 h = ⅓ of 24 h).
 */

import { utils } from 'xlsx'
import type { WorkBook } from 'xlsx'
import type { ParsedLine, ParseResult, TimesheetParser } from './types'

const SHEET_NAME = 'Halian TS'

// Column offsets (0-based) after the project block ends
const ADMIN_LABELS = ['Travel', 'Holidays', 'Sickness', 'Recup', 'Training', 'Team']

/** Excel serial → JS Date (handles the Excel 1900 leap-year bug) */
function excelDateToJsDate(serial: number): Date {
  // Excel epoch: Jan 1 1900 = serial 1 (with the 1900 leap-year bug, so subtract 1)
  return new Date((serial - 25569) * 86400 * 1000)
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Convert Excel time fraction to real hours, rounded to 2 decimal places. */
function excelTimeToHours(v: unknown): number {
  if (typeof v !== 'number' || v <= 0) return 0
  return Math.round(v * 24 * 100) / 100
}

function isDayName(v: unknown): boolean {
  return typeof v === 'string' &&
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].includes(v as string)
}

/** Map an admin-column label to a timesheet line type. */
function adminLabelToType(label: string): string {
  if (label === 'Holidays') return 'VACATION'
  if (label === 'Sickness') return 'SICK_LEAVE'
  if (label === 'Training') return 'TRAINING'
  return 'WORK'           // Travel, Recup, Team → WORK with description
}

// ── Parser implementation ─────────────────────────────────────────────────────

export const halianParser: TimesheetParser = {
  name: 'Halian / ACTIUM-IO',

  detect(wb: WorkBook): boolean {
    return wb.SheetNames.includes(SHEET_NAME)
  },

  parse(wb: WorkBook): ParseResult {
    const ws = wb.Sheets[SHEET_NAME]
    // Convert to a 2-D array with raw cell values
    const raw: unknown[][] = utils.sheet_to_json(ws, { header: 1, defval: '', raw: true })

    const warnings: string[] = []
    const lines: ParsedLine[] = []

    // ── 1. Consultant name (row 6, col 1) ────────────────────────────────────
    const consultant = String(raw[5]?.[1] ?? '').trim() || undefined

    // ── 2. Month/year from Excel serial (row 7, col 8) ───────────────────────
    const monthSerial = raw[6]?.[8]
    if (typeof monthSerial !== 'number') {
      throw new Error('Não foi possível detectar o mês no ficheiro.')
    }
    const monthDate = excelDateToJsDate(monthSerial)
    const month = monthDate.getMonth() + 1
    const year  = monthDate.getFullYear()

    // ── 3. Locate project headers (row 14, starting col 2) ───────────────────
    // Each project occupies 3 columns (rate ×1, ×1.5, ×2).
    // After all projects come the admin columns.
    const projectHeaderRow = raw[13] ?? []
    const projects: { name: string; colStart: number }[] = []
    let col = 2
    while (col < projectHeaderRow.length) {
      const cell = String(projectHeaderRow[col] ?? '').trim()
      if (!cell || ADMIN_LABELS.some(l => cell.includes(l))) break
      // Extract just the project title (after "!")
      const name = cell.includes('!') ? cell.split('!')[1].trim() : cell
      projects.push({ name, colStart: col })
      col += 3   // 3 columns per project
    }

    // Admin columns are located by scanning row 15 for the 'Travel' label.
    // The template has slots for up to 6 projects (18 columns) but unused slots
    // are blank, so we can't infer the admin start from the project block alone.
    const multiplierRow = raw[14] ?? []
    let adminStartCol = col  // fallback: right after last detected project
    for (let c = 2; c < multiplierRow.length; c++) {
      if (String(multiplierRow[c] ?? '').trim() === 'Travel') {
        adminStartCol = c
        break
      }
    }

    // ── 4. Parse data rows ────────────────────────────────────────────────────
    for (let ri = 15; ri < raw.length; ri++) {
      const row = raw[ri]
      if (!row || row.length === 0) continue

      // Stop at TOTAL row
      if (String(row[0]).trim() === 'TOTAL') break

      const dateSerial = row[0]
      const dayName    = row[1]

      // Must be a valid day row
      if (typeof dateSerial !== 'number' || !isDayName(dayName)) continue

      // Note: weekends are NOT skipped — weekend overtime (e.g. ×2 on Saturday)
      // is valid and must be imported. Rows with no hours produce no lines naturally.

      const date = isoDate(excelDateToJsDate(dateSerial))

      // ── Project hours ───────────────────────────────────────────────────────
      for (const proj of projects) {
        const h1   = excelTimeToHours(row[proj.colStart])      // rate ×1
        const h15  = excelTimeToHours(row[proj.colStart + 1])  // rate ×1.5
        const h2   = excelTimeToHours(row[proj.colStart + 2])  // rate ×2

        // Preferred: keep rate-1 separate from overtime
        if (h1 > 0) {
          lines.push({ date, hours: h1, extraHours: 0, rawRate: 1, type: 'WORK', description: proj.name })
        }
        // ×1.5 overtime
        if (h15 > 0) {
          lines.push({ date, hours: 0, extraHours: h15, rawRate: 1.5, type: 'WORK', description: proj.name })
        }
        // ×2 overtime
        if (h2 > 0) {
          lines.push({ date, hours: 0, extraHours: h2, rawRate: 2, type: 'WORK', description: proj.name })
        }
      }

      // ── Administrative columns ──────────────────────────────────────────────
      ADMIN_LABELS.forEach((label, i) => {
        const h = excelTimeToHours(row[adminStartCol + i])
        if (h <= 0) return
        const type = adminLabelToType(label)
        lines.push({ date, hours: h, extraHours: 0, rawRate: 1, type, description: label })
      })
    }

    if (lines.length === 0) {
      warnings.push('Nenhuma linha de horas encontrada no ficheiro.')
    }

    return { format: halianParser.name, month, year, consultant, lines, warnings }
  },
}
