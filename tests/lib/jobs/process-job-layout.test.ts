import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JobErrorCode } from "@/lib/errors";
import {
  JobStatus,
  LayoutRegion,
  OcrBlockType,
  type Job,
  type OcrBlock,
} from "@/lib/types";

const mocks = vi.hoisted(() => ({
  tryClaimJobProcessing: vi.fn(),
  getJob: vi.fn(),
  updateJob: vi.fn(),
  fetchBlobBuffer: vi.fn(),
  uploadOutputDocx: vi.fn(),
  parseDocument: vi.fn(),
  processOcrBatches: vi.fn(),
  mergeBlocks: vi.fn(),
  runCompletenessGate: vi.fn(),
  runLayoutVerifyPass: vi.fn(),
  maybeStructurePass: vi.fn(),
  buildDocxBuffer: vi.fn(),
  buildLayoutDocxBuffer: vi.fn(),
  getConfig: vi.fn(),
}));

vi.mock("@/lib/config", () => ({
  getConfig: mocks.getConfig,
}));

vi.mock("@/lib/jobs/job-store", () => ({
  tryClaimJobProcessing: mocks.tryClaimJobProcessing,
  getJob: mocks.getJob,
  updateJob: mocks.updateJob,
}));

vi.mock("@/lib/blob", () => ({
  fetchBlobBuffer: mocks.fetchBlobBuffer,
  uploadOutputDocx: mocks.uploadOutputDocx,
}));

vi.mock("@/lib/parsers", () => ({
  parseDocument: mocks.parseDocument,
}));

vi.mock("@/lib/ocr/batch-processor", () => ({
  processOcrBatches: mocks.processOcrBatches,
}));

vi.mock("@/lib/merge-blocks", () => ({
  mergeBlocks: mocks.mergeBlocks,
}));

vi.mock("@/lib/ocr/completeness-gate", () => ({
  runCompletenessGate: mocks.runCompletenessGate,
  formatValidationErrors: vi.fn(() => "Layout validation failed: MISSING_NUMERIC_CELL"),
}));

vi.mock("@/lib/ocr/verify-pass", () => ({
  runLayoutVerifyPass: mocks.runLayoutVerifyPass,
}));

vi.mock("@/lib/ocr/structure-pass", () => ({
  maybeStructurePass: mocks.maybeStructurePass,
}));

vi.mock("@/lib/export/docx-builder", () => ({
  buildDocxBuffer: mocks.buildDocxBuffer,
}));

vi.mock("@/lib/export/layout-docx-builder", () => ({
  buildLayoutDocxBuffer: mocks.buildLayoutDocxBuffer,
}));

const { processJob } = await import("@/lib/jobs/process-job");

function makeJob(): Job {
  return {
    id: "job-layout-1",
    fileName: "invoice.png",
    mimeType: "image/png",
    blobUrl: "https://example.blob.vercel-storage.com/invoice.png",
    status: JobStatus.QUEUED,
    progress: { current: 0, total: 0 },
    createdAt: new Date().toISOString(),
  };
}

const ocrBlocks: OcrBlock[] = [
  {
    page: 1,
    type: OcrBlockType.TABLE,
    text: "items",
    rows: [
      ["A", "B", "C", "D"],
      ["1", "2", "3", "4"],
    ],
    bbox: { x: 0.1, y: 0.4, w: 0.8, h: 0.3 },
    region: LayoutRegion.LEFT,
  },
];

describe("processJob layout mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConfig.mockReturnValue({
      LAYOUT_EXPORT_V2: true,
      MAX_PAGES: 50,
    });
    mocks.tryClaimJobProcessing.mockResolvedValue(true);
    mocks.getJob.mockResolvedValue(makeJob());
    mocks.updateJob.mockResolvedValue(null);
    mocks.fetchBlobBuffer.mockResolvedValue(Buffer.from("png"));
    mocks.parseDocument.mockResolvedValue({
      pageCount: 1,
      nativeBlocks: [],
      ocrInputs: [
        {
          page: 1,
          mimeType: "image/png",
          data: Buffer.from("png"),
          label: "page-1",
        },
      ],
    });
    mocks.processOcrBatches.mockResolvedValue(ocrBlocks);
    mocks.mergeBlocks.mockReturnValue(ocrBlocks);
    mocks.runCompletenessGate
      .mockReturnValueOnce({
        ok: false,
        issues: [
          {
            reason: "MISSING_NUMERIC_CELL",
            message: "missing cell",
            page: 1,
          },
        ],
      })
      .mockReturnValueOnce({ ok: true, issues: [] });
    mocks.runLayoutVerifyPass.mockResolvedValue(ocrBlocks);
    mocks.buildLayoutDocxBuffer.mockResolvedValue(Buffer.from("layout-docx"));
    mocks.uploadOutputDocx.mockResolvedValue(
      "https://example.blob.vercel-storage.com/out.docx",
    );
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("runs verify pass after gate failure and skips structure pass", async () => {
    await processJob("job-layout-1");

    expect(mocks.runLayoutVerifyPass).toHaveBeenCalledTimes(1);
    expect(mocks.maybeStructurePass).not.toHaveBeenCalled();
    expect(mocks.buildLayoutDocxBuffer).toHaveBeenCalledWith(ocrBlocks);
    expect(mocks.buildDocxBuffer).not.toHaveBeenCalled();
    expect(mocks.updateJob).toHaveBeenCalledWith(
      "job-layout-1",
      expect.objectContaining({
        status: JobStatus.COMPLETED,
        outputBlobUrl: "https://example.blob.vercel-storage.com/out.docx",
      }),
    );
  });

  it("fails when gate still fails after verify pass", async () => {
    mocks.runCompletenessGate.mockReset();
    mocks.runCompletenessGate.mockReturnValue({
      ok: false,
      issues: [{ reason: "ARITHMETIC_MISMATCH", message: "bad math", page: 1 }],
    });

    await processJob("job-layout-1");

    expect(mocks.updateJob).toHaveBeenCalledWith(
      "job-layout-1",
      expect.objectContaining({
        status: JobStatus.FAILED,
        errorCode: JobErrorCode.OCR_FAILED,
      }),
    );
  });
});

describe("processJob v1 mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getConfig.mockReturnValue({
      LAYOUT_EXPORT_V2: false,
      MAX_PAGES: 50,
    });
    mocks.tryClaimJobProcessing.mockResolvedValue(true);
    mocks.getJob.mockResolvedValue(makeJob());
    mocks.updateJob.mockResolvedValue(null);
    mocks.fetchBlobBuffer.mockResolvedValue(Buffer.from("png"));
    mocks.parseDocument.mockResolvedValue({
      pageCount: 1,
      nativeBlocks: [],
      ocrInputs: [
        {
          page: 1,
          mimeType: "image/png",
          data: Buffer.from("png"),
          label: "page-1",
        },
      ],
    });
    mocks.processOcrBatches.mockResolvedValue(ocrBlocks);
    mocks.mergeBlocks.mockReturnValue(ocrBlocks);
    mocks.maybeStructurePass.mockResolvedValue(ocrBlocks);
    mocks.buildDocxBuffer.mockResolvedValue(Buffer.from("v1-docx"));
    mocks.uploadOutputDocx.mockResolvedValue(
      "https://example.blob.vercel-storage.com/out.docx",
    );
  });

  it("uses structure pass and v1 docx export", async () => {
    await processJob("job-layout-1");

    expect(mocks.runCompletenessGate).not.toHaveBeenCalled();
    expect(mocks.runLayoutVerifyPass).not.toHaveBeenCalled();
    expect(mocks.maybeStructurePass).toHaveBeenCalledWith(ocrBlocks);
    expect(mocks.buildDocxBuffer).toHaveBeenCalledWith(ocrBlocks);
    expect(mocks.buildLayoutDocxBuffer).not.toHaveBeenCalled();
  });
});
