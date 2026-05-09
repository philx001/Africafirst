-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('generic', 'formation_admin', 'conseil_ia', 'dev_automation', 'produit_physique', 'partenariat', 'autre');

-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "offerType" "OfferType" NOT NULL DEFAULT 'generic';

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "offerType" "OfferType" NOT NULL DEFAULT 'generic';

-- CreateIndex
CREATE INDEX "deals_offerType_organizationId_idx" ON "deals"("offerType", "organizationId");

-- CreateIndex
CREATE INDEX "projects_offerType_organizationId_idx" ON "projects"("offerType", "organizationId");
