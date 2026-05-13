-- Modèles de devis internes et type de prestation sur les quotes

CREATE TABLE "quote_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "prestationType" "ContractActivityType" NOT NULL,
    "content" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "quote_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "quote_templates_organizationId_idx" ON "quote_templates"("organizationId");

CREATE INDEX "quote_templates_prestationType_organizationId_idx" ON "quote_templates"("prestationType", "organizationId");

ALTER TABLE "quote_templates" ADD CONSTRAINT "quote_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "quotes" ADD COLUMN "body" TEXT,
ADD COLUMN "prestationType" "ContractActivityType" NOT NULL DEFAULT 'autre',
ADD COLUMN "templateId" TEXT;

CREATE INDEX "quotes_prestationType_organizationId_idx" ON "quotes"("prestationType", "organizationId");

CREATE INDEX "quotes_templateId_idx" ON "quotes"("templateId");

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "quote_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
