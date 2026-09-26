export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
// Kept conservative for shared hosting: the whole file is buffered in memory
// while parsing the upload and writing it to disk, so a large cap here
// translates directly into peak RAM per request.
// Whole-request cap for Server Actions (serverActions.bodySizeLimit in
// next.config.ts — keep in sync). Forms that post several images at once
// check their total against this before submitting.
export const MAX_ACTION_BODY_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PDF_BYTES = 50 * 1024 * 1024; // 50 MB

export function formatMaxSize(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}
