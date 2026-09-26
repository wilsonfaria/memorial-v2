/**
 * Steps of the homepage "Por trás do Memorial" block. Each step is shown as
 * a button on the site; href is optional (empty → plain, non-clickable pill).
 *
 * Stored as JSON in HomepageContent.behindLabels (a TEXT column) so no schema
 * migration was needed. Older rows hold a plain comma-separated list of
 * labels ("Digitalização,Pesquisa,...") — still parsed, with empty links.
 */
export type BehindStep = { label: string; href: string };

export function parseBehindSteps(raw: string | null | undefined): BehindStep[] {
  const value = (raw ?? "").trim();
  if (!value) return [];

  if (value.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((s) => ({
            label: String(s?.label ?? "").trim(),
            href: String(s?.href ?? "").trim(),
          }))
          .filter((s) => s.label);
      }
    } catch {
      // Fall through to the legacy comma-separated format.
    }
  }

  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((label) => ({ label, href: "" }));
}

export function serializeBehindSteps(steps: BehindStep[]): string {
  return JSON.stringify(
    steps
      .map((s) => ({ label: s.label.trim(), href: s.href.trim() }))
      .filter((s) => s.label)
  );
}
