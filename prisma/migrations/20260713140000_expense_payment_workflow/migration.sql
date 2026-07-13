-- AlterTable: Expense — fluxo financeiro pós-aprovação (APPROVED -> PROCESSING -> PAID)
ALTER TABLE "Expense" ADD COLUMN "processedAt" TIMESTAMP(3);
ALTER TABLE "Expense" ADD COLUMN "paidAt" TIMESTAMP(3);
