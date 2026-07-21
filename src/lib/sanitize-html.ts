import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u",
  "h2", "h3", "h4",
  "ul", "ol", "li",
  "a", "img",
  "blockquote",
];

const ALLOWED_ATTR = ["href", "target", "rel", "src", "alt"];

/** Sanitizes admin-authored HTML (CMS page bodies) down to a small, safe allowlist. */
export function sanitizePageHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}
