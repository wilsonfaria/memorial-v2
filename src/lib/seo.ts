/** Plain-text excerpt from a CMS HTML body, for use as an Open Graph / meta description. */
export function htmlToDescription(html: string, maxLen = 160): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1).trimEnd()}…`;
}
