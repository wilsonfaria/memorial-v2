export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_PDF_BYTES = 80 * 1024 * 1024; // 80 MB

export function formatMaxSize(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}
