ALTER TABLE "TimesheetLine"
ADD COLUMN "perDiemRate" DECIMAL(10,2),
ADD COLUMN "perDiemAmount" DECIMAL(12,2);

-- Preserve existing international periods as one zero-hour timesheet line per calendar day.
INSERT INTO "TimesheetLine" (
  "id", "timesheetId", "date", "projectId", "type", "hours", "extraHours",
  "description", "perDiemRate", "perDiemAmount", "createdAt"
)
SELECT
  md5(random()::text || clock_timestamp()::text || day::text),
  period."timesheetId", day::date, period."projectId", 'INTERNATIONAL_TRAVEL', 0, 0,
  period."description", period."dailyRate", period."dailyRate", CURRENT_TIMESTAMP
FROM "TravelPeriod" period
CROSS JOIN LATERAL generate_series(period."startDate", period."endDate", interval '1 day') day;

DROP TABLE "MileageEntry";
DROP TABLE "TravelPeriod";
ALTER TABLE "Employee" DROP COLUMN "mileageMode";
ALTER TABLE "Employee" RENAME COLUMN "mileageRate" TO "travelDayRate";
ALTER TABLE "Payroll" RENAME COLUMN "mileageTotal" TO "travelDaysTotal";
