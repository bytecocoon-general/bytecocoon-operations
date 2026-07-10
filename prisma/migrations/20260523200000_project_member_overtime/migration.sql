-- CreateTable: ProjectMember — alocação colaborador/projecto com config de overtime, on-call e despesas
CREATE TABLE "ProjectMember" (
    "id"                          TEXT NOT NULL,
    "projectId"                   TEXT NOT NULL,
    "employeeId"                  TEXT NOT NULL,
    "role"                        TEXT,
    "startDate"                   DATE,
    "endDate"                     DATE,
    "clientRate"                  DECIMAL(10,2) NOT NULL DEFAULT 0,
    "overtimeAllowed"             BOOLEAN NOT NULL DEFAULT false,
    "overtimeWeekdayMultiplier"   DECIMAL(4,2)  NOT NULL DEFAULT 1.5,
    "overtimeWeekendMultiplier"   DECIMAL(4,2)  NOT NULL DEFAULT 2.0,
    "onCallAllowed"               BOOLEAN NOT NULL DEFAULT false,
    "onCallWeeklyRate"            DECIMAL(10,2) NOT NULL DEFAULT 0,
    "expensesAllowed"             BOOLEAN NOT NULL DEFAULT false,
    "expensesMonthlyLimit"        DECIMAL(10,2),
    "createdAt"                   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectMember_projectId_employeeId_key"
    ON "ProjectMember"("projectId", "employeeId");

ALTER TABLE "ProjectMember"
    ADD CONSTRAINT "ProjectMember_projectId_fkey"
        FOREIGN KEY ("projectId")  REFERENCES "Project"("id")  ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "ProjectMember_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: TimesheetLine — adicionar overtimeMultiplier
ALTER TABLE "TimesheetLine"
    ADD COLUMN "overtimeMultiplier" DECIMAL(4,2);
