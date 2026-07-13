ALTER TABLE "Employee"
ADD COLUMN "employmentType" TEXT NOT NULL DEFAULT 'INTERNAL',
ADD COLUMN "monthlySalary" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "perDiemRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "mileageMode" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN "mileageRate" DECIMAL(10,4) NOT NULL DEFAULT 0;

ALTER TABLE "ProjectMember" ADD COLUMN "perDiemRate" DECIMAL(10,2);

ALTER TABLE "Payroll"
ADD COLUMN "salaryAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "perDiemTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "mileageTotal" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE "TravelPeriod" (
  "id" TEXT NOT NULL, "timesheetId" TEXT NOT NULL, "projectId" TEXT,
  "startDate" DATE NOT NULL, "endDate" DATE NOT NULL, "country" TEXT NOT NULL,
  "description" TEXT, "dailyRate" DECIMAL(10,2) NOT NULL, "days" INTEGER NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "TravelPeriod_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MileageEntry" (
  "id" TEXT NOT NULL, "timesheetId" TEXT NOT NULL, "projectId" TEXT,
  "date" DATE NOT NULL, "origin" TEXT NOT NULL, "destination" TEXT NOT NULL,
  "purpose" TEXT, "kilometres" DECIMAL(10,2) NOT NULL, "vehiclePlate" TEXT,
  "rateMode" TEXT NOT NULL, "rate" DECIMAL(10,4) NOT NULL, "amount" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MileageEntry_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "TravelPeriod" ADD CONSTRAINT "TravelPeriod_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TravelPeriod" ADD CONSTRAINT "TravelPeriod_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MileageEntry" ADD CONSTRAINT "MileageEntry_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MileageEntry" ADD CONSTRAINT "MileageEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "TravelPeriod_timesheetId_idx" ON "TravelPeriod"("timesheetId");
CREATE INDEX "MileageEntry_timesheetId_date_idx" ON "MileageEntry"("timesheetId", "date");
