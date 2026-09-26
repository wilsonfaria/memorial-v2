/**
 * Whether an admin-entered link is safe to render as an <a href>: site-relative
 * paths, in-page anchors, http(s) and mailto only — blocks javascript:/data: URLs.
 */
export function isSafeHref(href: string): boolean {
  if (href.startsWith("/")) return !href.startsWith("//");
  if (href.startsWith("#")) return true;
  return /^(https?:\/\/|mailto:)/i.test(href);
}
