export const JobErrorCode = {
  UNSUPPORTED_FORMAT: "UNSUPPORTED_FORMAT",
  EMPTY_DOCUMENT: "EMPTY_DOCUMENT",
  PARSE_FAILED: "PARSE_FAILED",
  PAGE_LIMIT_EXCEEDED: "PAGE_LIMIT_EXCEEDED",
  OCR_FAILED: "OCR_FAILED",
} as const;

export type JobErrorCode = (typeof JobErrorCode)[keyof typeof JobErrorCode];

export class JobProcessingError extends Error {
  readonly code: JobErrorCode;

  constructor(code: JobErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "JobProcessingError";
  }
}
