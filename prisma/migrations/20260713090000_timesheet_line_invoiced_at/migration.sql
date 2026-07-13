-- AlterTable: TimesheetLine — marca quando a linha entrou numa factura gerada
ALTER TABLE "TimesheetLine" ADD COLUMN "invoicedAt" TIMESTAMP(3);
