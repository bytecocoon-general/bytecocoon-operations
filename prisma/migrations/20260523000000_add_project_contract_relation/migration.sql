-- Add contractId to Project
ALTER TABLE "Project" ADD COLUMN "contractId" TEXT;

ALTER TABLE "Project" ADD CONSTRAINT "Project_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "Contract"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
