-- AlterTable: Timesheet — cache de "já não há nada por facturar", para saltar em runs futuras
ALTER TABLE "Timesheet" ADD COLUMN "fullyInvoicedAt" TIMESTAMP(3);
