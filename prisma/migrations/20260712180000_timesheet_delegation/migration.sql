-- AlterTable: Employee — hierarquia gestor→colaborador (equipa de um MANAGER)
ALTER TABLE "Employee" ADD COLUMN "managerId" TEXT;

-- AlterTable: Timesheet — quem introduziu efectivamente o registo (quando != dono)
ALTER TABLE "Timesheet" ADD COLUMN "createdById" TEXT;

CREATE INDEX "Employee_managerId_idx" ON "Employee"("managerId");
CREATE INDEX "Timesheet_createdById_idx" ON "Timesheet"("createdById");

ALTER TABLE "Employee"
    ADD CONSTRAINT "Employee_managerId_fkey"
        FOREIGN KEY ("managerId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Timesheet"
    ADD CONSTRAINT "Timesheet_createdById_fkey"
        FOREIGN KEY ("createdById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
