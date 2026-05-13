-- AlterEnum
ALTER TYPE "ContractStatus" ADD VALUE IF NOT EXISTS 'to_modify';

-- CreateEnum
CREATE TYPE "ContractActivityType" AS ENUM (
  'plateforme_formation',
  'creation_application_site',
  'conseil',
  'sensibilisation_formation_ia',
  'autre'
);

-- CreateEnum
CREATE TYPE "SignatureProvider" AS ENUM ('internal_portal', 'external_webhook');

-- CreateTable
CREATE TABLE "contract_folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "contract_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "activityType" "ContractActivityType" NOT NULL,
    "content" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "contracts"
  ADD COLUMN "activityType" "ContractActivityType" NOT NULL DEFAULT 'autre',
  ADD COLUMN "signatureProvider" "SignatureProvider" NOT NULL DEFAULT 'internal_portal',
  ADD COLUMN "folderPath" TEXT,
  ADD COLUMN "folderId" TEXT,
  ADD COLUMN "templateId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "contract_folders_organizationId_slug_parentId_key"
ON "contract_folders"("organizationId", "slug", "parentId");

-- CreateIndex
CREATE INDEX "contract_folders_organizationId_idx" ON "contract_folders"("organizationId");

-- CreateIndex
CREATE INDEX "contract_folders_parentId_idx" ON "contract_folders"("parentId");

-- CreateIndex
CREATE INDEX "contract_templates_organizationId_idx" ON "contract_templates"("organizationId");

-- CreateIndex
CREATE INDEX "contract_templates_activityType_organizationId_idx"
ON "contract_templates"("activityType", "organizationId");

-- CreateIndex
CREATE INDEX "contracts_folderId_idx" ON "contracts"("folderId");

-- CreateIndex
CREATE INDEX "contracts_templateId_idx" ON "contracts"("templateId");

-- CreateIndex
CREATE INDEX "contracts_activityType_organizationId_idx"
ON "contracts"("activityType", "organizationId");

-- AddForeignKey
ALTER TABLE "contract_folders"
ADD CONSTRAINT "contract_folders_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_folders"
ADD CONSTRAINT "contract_folders_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "contract_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_templates"
ADD CONSTRAINT "contract_templates_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts"
ADD CONSTRAINT "contracts_folderId_fkey"
FOREIGN KEY ("folderId") REFERENCES "contract_folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts"
ADD CONSTRAINT "contracts_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "contract_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
