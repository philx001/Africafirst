/** Tire les adresses `@email` du corps (commentaire ticket). Insensible à la casse en sortie (normalisées en minuscules). */
const AT_EMAIL =
  /@([a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,})/g;

export function extractMentionEmails(body: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(AT_EMAIL.source, 'g');
  while ((m = re.exec(body)) !== null) {
    const key = m[1].toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}
