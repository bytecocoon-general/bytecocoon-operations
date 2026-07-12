ALTER TABLE "Employee"
ADD COLUMN "accessStatus" TEXT NOT NULL DEFAULT 'APPROVED',
ADD COLUMN "accessReviewedAt" TIMESTAMP(3),
ADD COLUMN "accessReviewedBy" TEXT;

CREATE TABLE "RegistrationInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "clerkInvitationId" TEXT,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "registeredAt" TIMESTAMP(3),
    "employeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RegistrationInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistrationInvite_clerkInvitationId_key" ON "RegistrationInvite"("clerkInvitationId");
CREATE UNIQUE INDEX "RegistrationInvite_employeeId_key" ON "RegistrationInvite"("employeeId");
CREATE INDEX "RegistrationInvite_email_idx" ON "RegistrationInvite"("email");
CREATE INDEX "RegistrationInvite_status_idx" ON "RegistrationInvite"("status");
