-- Add isBillable to Project
ALTER TABLE "Project" ADD COLUMN "isBillable" BOOLEAN NOT NULL DEFAULT true;

-- Update existing internal projects (no client = not billable)
UPDATE "Project" SET "isBillable" = false WHERE "clientId" IS NULL;

-- CreateTable: Skill — catálogo global de competências técnicas
CREATE TABLE "Skill" (
    "id"        TEXT NOT NULL,
    "name"      TEXT NOT NULL,
    "category"  TEXT NOT NULL DEFAULT 'Técnico',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateTable: EmployeeSkill — competências de um colaborador com nível
CREATE TABLE "EmployeeSkill" (
    "id"         TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "skillId"    TEXT NOT NULL,
    "level"      INTEGER NOT NULL DEFAULT 3,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeSkill_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EmployeeSkill_employeeId_skillId_key" ON "EmployeeSkill"("employeeId", "skillId");

ALTER TABLE "EmployeeSkill"
    ADD CONSTRAINT "EmployeeSkill_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "EmployeeSkill_skillId_fkey"
        FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: ProjectSkill — competências requeridas por projecto
CREATE TABLE "ProjectSkill" (
    "id"        TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "skillId"   TEXT NOT NULL,
    "minLevel"  INTEGER NOT NULL DEFAULT 3,
    "required"  BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProjectSkill_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProjectSkill_projectId_skillId_key" ON "ProjectSkill"("projectId", "skillId");

ALTER TABLE "ProjectSkill"
    ADD CONSTRAINT "ProjectSkill_projectId_fkey"
        FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "ProjectSkill_skillId_fkey"
        FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: OperationalTarget — targets mensais de KPIs
CREATE TABLE "OperationalTarget" (
    "id"                TEXT NOT NULL,
    "month"             INTEGER NOT NULL,
    "year"              INTEGER NOT NULL,
    "revenueTarget"     DECIMAL(12,2),
    "marginTarget"      DECIMAL(5,2),
    "utilizationTarget" DECIMAL(5,2),
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperationalTarget_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OperationalTarget_month_year_key" ON "OperationalTarget"("month", "year");
