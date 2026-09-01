export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_IMAGES_PER_GROUP = 8;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function isAllowedImageType(mimeType: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}
