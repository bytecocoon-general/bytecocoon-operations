-- DropForeignKey (contract relations)
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_clientId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_contractId_fkey";

-- Step 1: Add new columns to Project
ALTER TABLE "Project"
ADD COLUMN "contractStatus" TEXT,
ADD COLUMN "contractType"   TEXT,
ADD COLUMN "currency"       TEXT NOT NULL DEFAULT 'EUR',
ADD COLUMN "description"    TEXT,
ADD COLUMN "endDate"        DATE,
ADD COLUMN "startDate"      DATE;

-- Step 2: Migrate contract data into projects before dropping Contract table
UPDATE "Project" p
SET
  "contractType"   = c."type",
  "contractStatus" = c."status",
  "startDate"      = c."startDate",
  "endDate"        = c."endDate",
  "budget"         = COALESCE(p."budget", c."value"),
  "currency"       = c."currency",
  "description"    = c."description"
FROM "Contract" c
WHERE p."contractId" = c."id";

-- Step 3: Drop contractId FK column from Project
ALTER TABLE "Project" DROP COLUMN "contractId";

-- Step 4: Drop Contract table
DROP TABLE "Contract";
