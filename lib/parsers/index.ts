import { MimeType, SUPPORTED_MIME_TYPES, type ParseResult } from "../types";
import { JobErrorCode, JobProcessingError } from "../errors";
import { parsePdf } from "./pdf-parser";
import { parseDocx } from "./docx-parser";
import { parseImage } from "./image-parser";

export function isSupportedMimeType(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.includes(mimeType);
}

export function rejectLegacyDoc(fileName: string): void {
  if (fileName.toLowerCase().endsWith(".doc")) {
    throw new JobProcessingError(
      JobErrorCode.UNSUPPORTED_FORMAT,
      "Legacy .doc format is not supported. Convert to DOCX.",
    );
  }
}

export async function parseDocument(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<ParseResult> {
  rejectLegacyDoc(fileName);

  if (!isSupportedMimeType(mimeType)) {
    throw new JobProcessingError(
      JobErrorCode.UNSUPPORTED_FORMAT,
      `Unsupported file type: ${mimeType}`,
    );
  }

  if (mimeType === MimeType.PDF) {
    return parsePdf(buffer);
  }

  if (mimeType === MimeType.DOCX) {
    return parseDocx(buffer);
  }

  if (
    mimeType === MimeType.JPEG ||
    mimeType === MimeType.PNG ||
    mimeType === MimeType.WEBP
  ) {
    return parseImage(buffer, mimeType);
  }

  throw new JobProcessingError(
    JobErrorCode.UNSUPPORTED_FORMAT,
    `Unsupported file type: ${mimeType}`,
  );
}

export { JobErrorCode, JobProcessingError };
