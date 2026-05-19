import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

const MAX_MB_HARD = 5120;
const MAX_COUNT_HARD = 500;

export interface TicketAttachmentQuota {
  maxTotalMb: number | undefined;
  maxCount: number | undefined;
}

function extractOptionalPositiveInt(raw: unknown, min: number, max: number): number | undefined {
  if (raw === undefined || raw === null) return undefined;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return undefined;
  const x = Math.floor(n);
  if (x < min || x > max) return undefined;
  return x;
}

/** Quotas optionnels depuis `organization.settings` (clés absentes ou invalides = illimité). */
export function extractTicketAttachmentQuota(settingsJson: unknown): TicketAttachmentQuota {
  if (!settingsJson || typeof settingsJson !== 'object') {
    return { maxTotalMb: undefined, maxCount: undefined };
  }
  const s = settingsJson as Record<string, unknown>;
  return {
    maxTotalMb: extractOptionalPositiveInt(s.ticketAttachmentMaxTotalMb, 1, MAX_MB_HARD),
    maxCount: extractOptionalPositiveInt(s.ticketAttachmentMaxCount, 1, MAX_COUNT_HARD),
  };
}

export async function assertTicketAttachmentQuota(
  prisma: PrismaService,
  organizationId: string,
  ticketId: string,
  newFileSizeBytes: number,
  settingsJson: unknown,
): Promise<void> {
  const { maxTotalMb, maxCount } = extractTicketAttachmentQuota(settingsJson);

  if (newFileSizeBytes <= 0) {
    throw new BadRequestException('Le fichier est vide ou taille invalide.');
  }

  if (maxTotalMb === undefined && maxCount === undefined) return;

  const [agg, count] = await Promise.all([
    prisma.document.aggregate({
      where: { organizationId, ticketId },
      _sum: { size: true },
    }),
    prisma.document.count({ where: { organizationId, ticketId } }),
  ]);

  const currentBytes = agg._sum.size ?? 0;

  if (maxCount !== undefined && count >= maxCount) {
    throw new BadRequestException(
      `Quota fichiers ticket atteint (${maxCount} pièce(s) maximum pour ce ticket).`,
    );
  }

  if (maxTotalMb !== undefined) {
    const capBytes = maxTotalMb * 1024 * 1024;
    if (currentBytes + newFileSizeBytes > capBytes) {
      const reste = Math.max(0, capBytes - currentBytes);
      const resteKb = Math.ceil(reste / 1024);
      const resteLabel = resteKb < 1024 ? `${resteKb} Ko` : `${(reste / (1024 * 1024)).toFixed(1)} Mo`;
      throw new BadRequestException(
        `Quota volume ticket dépassé (${maxTotalMb} Mo max, ${reste <= 0 ? '0' : resteLabel} restants).`,
      );
    }
  }
}
