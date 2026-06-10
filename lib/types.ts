export const JobStatus = {
  QUEUED: "queued",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const MimeType = {
  PDF: "application/pdf",
  DOCX:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  JPEG: "image/jpeg",
  PNG: "image/png",
  WEBP: "image/webp",
} as const;

export type MimeType = (typeof MimeType)[keyof typeof MimeType];

export const OcrBlockType = {
  HEADING: "heading",
  PARAGRAPH: "paragraph",
  TABLE: "table",
  LIST: "list",
} as const;

export type OcrBlockType = (typeof OcrBlockType)[keyof typeof OcrBlockType];

export const BlockLanguage = {
  VI: "vi",
  JA: "ja",
  MIXED: "mixed",
  UNKNOWN: "unknown",
} as const;

export type BlockLanguage = (typeof BlockLanguage)[keyof typeof BlockLanguage];

export const BlockConfidence = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

export type BlockConfidence =
  (typeof BlockConfidence)[keyof typeof BlockConfidence];

export interface OcrBlock {
  page: number;
  type: OcrBlockType;
  level?: number;
  text: string;
  language?: BlockLanguage;
  confidence?: BlockConfidence;
  rows?: string[][];
}

export interface JobProgress {
  current: number;
  total: number;
}

export interface Job {
  id: string;
  fileName: string;
  mimeType: string;
  blobUrl: string;
  status: JobStatus;
  progress: JobProgress;
  outputBlobUrl?: string;
  blocks?: OcrBlock[];
  error?: string;
  errorCode?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ParseResult {
  pageCount: number;
  nativeBlocks: OcrBlock[];
  ocrInputs: OcrInput[];
}

export interface OcrInput {
  page: number;
  mimeType: string;
  data: Buffer;
  label: string;
}

export const SUPPORTED_MIME_TYPES: readonly string[] = [
  MimeType.PDF,
  MimeType.DOCX,
  MimeType.JPEG,
  MimeType.PNG,
  MimeType.WEBP,
];
