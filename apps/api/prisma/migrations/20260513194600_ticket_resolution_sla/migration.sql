-- B4++ : SLA résolution (échéance distincte de la première réponse)

ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "resolutionSlaDueAt" TIMESTAMP(3);

UPDATE "tickets"
SET "resolutionSlaDueAt" = "createdAt" + CASE "priority"::text
  WHEN 'urgent' THEN INTERVAL '24 hours'
  WHEN 'high' THEN INTERVAL '48 hours'
  WHEN 'medium' THEN INTERVAL '72 hours'
  WHEN 'low' THEN INTERVAL '168 hours'
  ELSE INTERVAL '72 hours'
END
WHERE "resolutionSlaDueAt" IS NULL;
