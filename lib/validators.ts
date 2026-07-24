import { z } from 'zod'

export const timesheetLineSchema = z.object({
  date:               z.string(),
  projectId:          z.string().nullable().optional(),
  type:               z.enum(['WORK','VACATION','SICK_LEAVE','PUBLIC_HOLIDAY','OTHER_ABSENCE','ON_CALL','INTERNATIONAL_TRAVEL']),
  hours:              z.number().min(0).max(24),
  extraHours:         z.number().min(0).max(24).default(0),
  // Multiplicador declarado pelo colaborador para as horas extra (ex: 1.5 = 150%, 2.0 = 200%)
  overtimeMultiplier: z.number().min(1).max(5).optional().nullable(),
  description:        z.string().max(500).optional().nullable(),
})

export const projectMemberSchema = z.object({
  // IDs existentes podem ter sido importados antes de o Prisma usar CUID.
  // A base de dados define este campo como String, por isso não devemos rejeitar
  // UUIDs ou outros identificadores válidos antes de consultar a relação.
  employeeId:                  z.string().min(1, 'Colaborador obrigatório'),
  role:                        z.string().max(100).optional().nullable(),
  startDate:                   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  endDate:                     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  clientRate:                  z.number().min(0).max(9999).default(0),
  perDiemRate:                 z.number().min(0).max(9999).optional().nullable(),
  overtimeAllowed:             z.boolean().default(false),
  overtimeWeekdayMultiplier:   z.number().min(1).max(5).default(1.5),
  overtimeWeekendMultiplier:   z.number().min(1).max(5).default(2.0),
  onCallAllowed:               z.boolean().default(false),
  onCallWeeklyRate:            z.number().min(0).max(9999).default(0),
  expensesAllowed:             z.boolean().default(false),
  expensesMonthlyLimit:        z.number().min(0).max(99999).optional().nullable(),
})

export const expenseSchema = z.object({
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  category:    z.string().min(1).max(100),
  amount:      z.number().positive().max(99999),
  projectId:   z.string().cuid().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
})

export const timesheetSchema = z.object({
  month:      z.number().int().min(1).max(12),
  year:       z.number().int().min(2020).max(2100),
  lines:      z.array(timesheetLineSchema).max(500),
  // Colaborador alvo, quando um ADMIN/MANAGER introduz em nome de outro (omitido = o próprio)
  employeeId: z.string().cuid().optional(),
})

export const employeeSchema = z.object({
  name:         z.string().min(2).max(100),
  email:        z.string().email(),
  hourlyRate:   z.number().min(0).max(9999),
  departmentId: z.string().cuid(),
  role:         z.enum(['EMPLOYEE', 'MANAGER', 'ADMIN']).default('EMPLOYEE'),
  managerId:    z.string().cuid().optional().nullable(),
  employmentType: z.enum(['INTERNAL', 'EXTERNAL']).default('INTERNAL'),
  monthlySalary: z.number().min(0).max(999999).default(0),
  perDiemRate: z.number().min(0).max(9999).default(0),
  travelDayRate: z.number().min(0).max(9999).default(0),
})

export const clientSchema = z.object({
  name:      z.string().min(2).max(200),
  email:     z.string().email().optional().nullable(),
  phone:     z.string().max(50).optional().nullable(),
  address:   z.string().max(500).optional().nullable(),
  vatNumber: z.string().max(50).optional().nullable(),
  country:   z.string().max(100).optional().nullable(),
  isActive:  z.boolean().default(true),
})

export const projectSchema = z.object({
  name:           z.string().min(1).max(100),
  clientId:       z.string().cuid().optional().nullable(),
  clientName:     z.string().min(1).max(100).optional().nullable(),
  budget:         z.number().positive().optional().nullable(),
  isActive:       z.boolean().default(true),
  isBillable:     z.boolean().default(true),
  contractType:   z.enum(['FIXED', 'TIME_AND_MATERIALS', 'RETAINER']).optional().nullable(),
  contractStatus: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED']).optional().nullable(),
  startDate:      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  endDate:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  currency:       z.string().length(3).default('EUR'),
  description:    z.string().max(1000).optional().nullable(),
})

export const invoiceLineSchema = z.object({
  projectId:   z.string().cuid().optional().nullable(),
  description: z.string().min(1).max(500),
  quantity:    z.number().positive().max(99999),
  unitPrice:   z.number().positive().max(99999),
})

export const invoiceSchema = z.object({
  clientId:  z.string().cuid(),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dueDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  taxRate:   z.number().min(0).max(100).default(23),
  currency:  z.string().length(3).default('EUR'),
  notes:     z.string().max(1000).optional().nullable(),
  lines:     z.array(invoiceLineSchema).min(1).max(200),
})

export const payrollSchema = z.object({
  employeeId:    z.string().cuid(),
  month:         z.number().int().min(1).max(12),
  year:          z.number().int().min(2020).max(2100),
  deductions:    z.number().min(0).default(0),
  notes:         z.string().max(500).optional().nullable(),
})
