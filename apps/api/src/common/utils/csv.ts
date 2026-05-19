/** RFC 4180-style CSV row builder with UTF-8 BOM for Excel. */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const s = String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const line = (cells: unknown[]) => cells.map(escapeCsvCell).join(',');
  const body = [line(headers), ...rows.map((r) => line(r))].join('\n');
  return `\uFEFF${body}`;
}
