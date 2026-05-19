import { Priority } from '@prisma/client';

import {

  DEFAULT_TICKET_SLA_FIRST_RESPONSE_HOURS,

  DEFAULT_TICKET_SLA_RESOLUTION_HOURS,

} from '@crm/shared';



const TICKET_PRIORITY_ORDER: Priority[] = [

  Priority.low,

  Priority.medium,

  Priority.high,

  Priority.urgent,

];



/** Plafond configurable (≈ an) pour éviter des valeurs absurdes. */

const MAX_TICKET_SLA_HOURS = 8760;



function builtinFirstResponseHours(p: Priority): number {

  return DEFAULT_TICKET_SLA_FIRST_RESPONSE_HOURS[p];

}



function builtinResolutionHours(p: Priority): number {

  return DEFAULT_TICKET_SLA_RESOLUTION_HOURS[p];

}



function parseHoursBlob(

  settingsJson: unknown,

  blobKey: 'ticketSlaHours' | 'ticketResolutionSlaHours',

): Partial<Record<Priority, number>> {

  const out: Partial<Record<Priority, number>> = {};

  if (!settingsJson || typeof settingsJson !== 'object') return out;

  const blob = (settingsJson as Record<string, unknown>)[blobKey];

  if (!blob || typeof blob !== 'object') return out;

  for (const p of TICKET_PRIORITY_ORDER) {

    const raw = (blob as Record<string, unknown>)[p];

    if (typeof raw === 'number' && Number.isFinite(raw)) {

      out[p] = Math.min(MAX_TICKET_SLA_HOURS, Math.max(1, Math.round(raw)));

    }

  }

  return out;

}



/** Interprète `organization.settings.ticketSlaHours` (priorité → nombre d’heures). */

export function parseTicketSlaOverridesFromSettings(settingsJson: unknown): Partial<Record<Priority, number>> {

  return parseHoursBlob(settingsJson, 'ticketSlaHours');

}



/** Interprète `organization.settings.ticketResolutionSlaHours`. */

export function parseTicketResolutionSlaOverridesFromSettings(

  settingsJson: unknown,

): Partial<Record<Priority, number>> {

  return parseHoursBlob(settingsJson, 'ticketResolutionSlaHours');

}



export function ticketFirstResponseSlaHours(priority: Priority, settingsJson: unknown): number {

  const overrides = parseTicketSlaOverridesFromSettings(settingsJson);

  const v = overrides[priority];

  if (typeof v === 'number') return v;

  return builtinFirstResponseHours(priority);

}



export function ticketResolutionSlaHours(priority: Priority, settingsJson: unknown): number {

  const overrides = parseTicketResolutionSlaOverridesFromSettings(settingsJson);

  const v = overrides[priority];

  if (typeof v === 'number') return v;

  return builtinResolutionHours(priority);

}



export function computeTicketFirstResponseSlaDueAt(

  anchorUtc: Date,

  priority: Priority,

  settingsJson: unknown,

): Date {

  return new Date(

    anchorUtc.getTime() + ticketFirstResponseSlaHours(priority, settingsJson) * 3600 * 1000,

  );

}



export function computeTicketResolutionSlaDueAt(

  anchorUtc: Date,

  priority: Priority,

  settingsJson: unknown,

): Date {

  return new Date(

    anchorUtc.getTime() + ticketResolutionSlaHours(priority, settingsJson) * 3600 * 1000,

  );

}

