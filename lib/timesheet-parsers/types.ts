/**
 * Shared types for timesheet Excel parsers.
 *
 * Each parser is responsible for recognising its own file format
 * and converting it into this neutral shape, ready to be inserted
 * into the database by the import API route.
 */

export interface ParsedLine {
  /** ISO date string — YYYY-MM-DD */
  date: string
  /** Regular hours */
  hours: number
  /** Overtime / extra hours */
  extraHours: number
  /** Original rate multiplier in the source file (1 | 1.5 | 2). Informational only. */
  rawRate: number
  /** WORK | VACATION | SICK_LEAVE | PUBLIC_HOLIDAY | TRAINING */
  type: string
  /** Optional note extracted from the source (e.g. "Travel", "Sickness") */
  description?: string
}

export interface ParseResult {
  /** Human-readable format name shown to the user */
  format: string
  /** Month detected in the file (1–12) */
  month: number
  /** Year detected in the file */
  year: number
  /** Consultant name, if present in the file */
  consultant?: string
  /** All non-empty lines extracted from the file */
  lines: ParsedLine[]
  /** Any non-fatal warnings produced during parsing */
  warnings: string[]
}

export interface TimesheetParser {
  name: string
  /** Returns true if the workbook matches this parser's format */
  detect(workbook: import('xlsx').WorkBook): boolean
  /** Parse the workbook and return the neutral result */
  parse(workbook: import('xlsx').WorkBook): ParseResult
}
