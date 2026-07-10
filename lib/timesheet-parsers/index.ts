/**
 * Timesheet parser registry.
 *
 * To add a new format:
 *   1. Create `lib/timesheet-parsers/my-format.ts` implementing TimesheetParser
 *   2. Import it here and add to PARSERS
 *
 * The first parser whose detect() returns true is used.
 * Parsers are tried in declaration order, so put more specific formats first.
 */

import type { WorkBook } from 'xlsx'
import type { ParseResult } from './types'
import { halianParser } from './halian'

const PARSERS = [
  halianParser,
  // Future: sapParser, genericParser, ...
]

/**
 * Auto-detect the format and parse the workbook.
 * Throws if no parser recognises the file.
 */
export function parseTimesheetFile(workbook: WorkBook): ParseResult {
  for (const parser of PARSERS) {
    if (parser.detect(workbook)) {
      return parser.parse(workbook)
    }
  }
  throw new Error(
    `Formato não reconhecido. Formatos suportados: ${PARSERS.map(p => p.name).join(', ')}.`
  )
}

export type { ParseResult, ParsedLine } from './types'
