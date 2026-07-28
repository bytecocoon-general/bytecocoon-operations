-- Add a unified compensation model while retaining legacy columns for compatibility.
ALTER TABLE "Employee"
ADD COLUMN "compensationAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "compensationType" TEXT NOT NULL DEFAULT 'HOURLY';

UPDATE "Employee"
SET
  "compensationType" = CASE WHEN "monthlySalary" > 0 THEN 'MONTHLY' ELSE 'HOURLY' END,
  "compensationAmount" = CASE WHEN "monthlySalary" > 0 THEN "monthlySalary" ELSE "hourlyRate" END;

ALTER TABLE "Payroll"
ADD COLUMN "compensationAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "compensationType" TEXT NOT NULL DEFAULT 'HOURLY',
ADD COLUMN "baseCompensation" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "Payroll"
SET
  "compensationType" = CASE WHEN "salaryAmount" > 0 THEN 'MONTHLY' ELSE 'HOURLY' END,
  "compensationAmount" = CASE WHEN "salaryAmount" > 0 THEN "salaryAmount" ELSE "hourlyRate" END,
  -- Preserve the base component already used by historical payrolls.
  "baseCompensation" = "grossPay" - "perDiemTotal" - "travelDaysTotal";
