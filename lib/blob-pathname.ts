import { v4 as uuidv4 } from "uuid";

const SAFE_EXT = /^\.[a-z0-9]{1,10}$/i;

/**
 * Vercel Blob pathname must be URL-safe. Original filenames with spaces or
 * parentheses can cause client-token / PUT pathname mismatches (400).
 */
export function buildBlobPathname(originalName: string): string {
  const dotIndex = originalName.lastIndexOf(".");
  const rawExt =
    dotIndex > 0 ? originalName.slice(dotIndex).toLowerCase() : "";
  const ext = SAFE_EXT.test(rawExt) ? rawExt : ".bin";
  return `uploads/${uuidv4()}${ext}`;
}
