import {
  GoogleGenerativeAI,
  type GenerativeModel,
  type Part,
} from "@google/generative-ai";
import { getConfig } from "../config";
import { JobErrorCode, JobProcessingError } from "../errors";
import {
  BlockConfidence,
  BlockLanguage,
  OcrBlockType,
  type OcrBlock,
  type OcrInput,
} from "../types";
import {
  OCR_SYSTEM_PROMPT,
  LAYOUT_OCR_SYSTEM_PROMPT,
  STRUCTURE_SYSTEM_PROMPT,
  buildOcrUserPrompt,
  buildLayoutOcrUserPrompt,
  buildStructurePrompt,
  parseOcrJsonResponse,
} from "./prompts";
import {
  normalizeLayoutBlocks,
  parseBboxFromRaw,
} from "./layout-normalize";

function getModel(
  modelName: string,
  systemInstruction: string,
  jsonResponse = true,
): GenerativeModel {
  const config = getConfig();
  const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction,
    generationConfig: jsonResponse
      ? { responseMimeType: "application/json" }
      : undefined,
  });
}

function getOcrModel(modelName: string): GenerativeModel {
  return getModel(modelName, OCR_SYSTEM_PROMPT);
}

function getLayoutOcrModel(modelName: string): GenerativeModel {
  return getModel(modelName, LAYOUT_OCR_SYSTEM_PROMPT);
}

function getStructureModel(modelName: string): GenerativeModel {
  return getModel(modelName, STRUCTURE_SYSTEM_PROMPT);
}

function isRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("429") ||
    message.includes("503") ||
    message.includes("UNAVAILABLE") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("Service Unavailable") ||
    message.includes("high demand") ||
    message.includes("timeout") ||
    message.includes("Timeout")
  );
}

function parseModelList(primary: string, fallbacksCsv: string): string[] {
  const extras = fallbacksCsv
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  return [...new Set([primary, ...extras])];
}

function ocrModelNames(config: ReturnType<typeof getConfig>, override?: string): string[] {
  if (override) {
    return [override];
  }
  return parseModelList(config.GEMINI_OCR_MODEL, config.GEMINI_OCR_MODEL_FALLBACK);
}

function structureModelNames(
  config: ReturnType<typeof getConfig>,
  override?: string,
): string[] {
  if (override) {
    return [override];
  }
  return parseModelList(
    config.GEMINI_STRUCTURE_MODEL,
    config.GEMINI_STRUCTURE_MODEL_FALLBACK,
  );
}

export { structureModelNames };

async function generateTextWithRetry(
  createModel: (modelName: string) => GenerativeModel,
  modelNames: string[],
  parts: Part[],
  config: ReturnType<typeof getConfig>,
): Promise<string> {
  let lastError: unknown;

  for (const modelName of modelNames) {
    const model = createModel(modelName);
    for (let attempt = 0; attempt <= config.retryBackoffMs.length; attempt++) {
      try {
        const result = await model.generateContent(parts);
        return result.response.text();
      } catch (error) {
        lastError = error;
        if (error instanceof JobProcessingError) {
          throw error;
        }
        const canRetry =
          isRetryableError(error) && attempt < config.retryBackoffMs.length;
        if (canRetry) {
          await sleep(config.retryBackoffMs[attempt] ?? 2000);
          continue;
        }
        break;
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new JobProcessingError(
    JobErrorCode.OCR_FAILED,
    String(lastError ?? "Gemini request failed"),
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeBlock(raw: Record<string, unknown>, fallbackPage: number): OcrBlock | null {
  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  if (!text) {
    return null;
  }

  const typeRaw = typeof raw.type === "string" ? raw.type : "paragraph";
  const type = Object.values(OcrBlockType).includes(typeRaw as OcrBlockType)
    ? (typeRaw as OcrBlockType)
    : OcrBlockType.PARAGRAPH;

  const languageRaw =
    typeof raw.language === "string" ? raw.language : BlockLanguage.UNKNOWN;
  const language = Object.values(BlockLanguage).includes(
    languageRaw as BlockLanguage,
  )
    ? (languageRaw as BlockLanguage)
    : BlockLanguage.UNKNOWN;

  const confidenceRaw =
    typeof raw.confidence === "string" ? raw.confidence : BlockConfidence.MEDIUM;
  const confidence = Object.values(BlockConfidence).includes(
    confidenceRaw as BlockConfidence,
  )
    ? (confidenceRaw as BlockConfidence)
    : BlockConfidence.MEDIUM;

  const page =
    typeof raw.page === "number" && raw.page > 0 ? raw.page : fallbackPage;

  const level =
    typeof raw.level === "number" && raw.level >= 1 && raw.level <= 6
      ? raw.level
      : undefined;

  const rows = Array.isArray(raw.rows)
    ? raw.rows
        .filter(Array.isArray)
        .map((row) =>
          row.filter((cell): cell is string => typeof cell === "string"),
        )
    : undefined;

  const bbox = parseBboxFromRaw(raw);

  return {
    page,
    type,
    level,
    text,
    language,
    confidence,
    rows,
    ...(bbox ? { bbox } : {}),
  };
}

export function normalizeOcrBlocks(
  payload: unknown,
  fallbackPage: number,
): OcrBlock[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) =>
      item && typeof item === "object"
        ? normalizeBlock(item as Record<string, unknown>, fallbackPage)
        : null,
    )
    .filter((block): block is OcrBlock => block !== null);
}

function inputToPart(input: OcrInput): Part {
  return {
    inlineData: {
      mimeType: input.mimeType,
      data: input.data.toString("base64"),
    },
  };
}

function assertNonEmptyOcrResult(
  blocks: OcrBlock[],
  inputs: OcrInput[],
  pageStart: number,
  pageEnd: number,
): OcrBlock[] {
  if (blocks.length === 0 && inputs.length > 0) {
    throw new JobProcessingError(
      JobErrorCode.OCR_FAILED,
      `Gemini returned no OCR blocks for pages ${pageStart}-${pageEnd}`,
    );
  }
  return blocks;
}

export async function ocrInputs(
  inputs: OcrInput[],
  pageStart: number,
  pageEnd: number,
  modelName?: string,
  docFileName?: string,
): Promise<OcrBlock[]> {
  const config = getConfig();
  const hint = docFileName
    ? `File: ${docFileName}${inputs[0]?.label ? ` | ${inputs[0].label}` : ""}`
    : inputs[0]?.label;
  const parts: Part[] = [
    { text: buildOcrUserPrompt(pageStart, pageEnd, hint) },
    ...inputs.map(inputToPart),
  ];

  const text = await generateTextWithRetry(
    getOcrModel,
    ocrModelNames(config, modelName),
    parts,
    config,
  );
  const parsed = parseOcrJsonResponse(text);
  const blocks = normalizeOcrBlocks(parsed, pageStart);
  return assertNonEmptyOcrResult(blocks, inputs, pageStart, pageEnd);
}

export async function ocrLayoutInputs(
  inputs: OcrInput[],
  pageStart: number,
  pageEnd: number,
  modelName?: string,
  modelNames?: string[],
  docFileName?: string,
): Promise<OcrBlock[]> {
  const config = getConfig();
  const parts: Part[] = [
    {
      text: buildLayoutOcrUserPrompt(pageStart, pageEnd, {
        fileName: docFileName,
        pageLabel: inputs[0]?.label,
      }),
    },
    ...inputs.map(inputToPart),
  ];

  const text = await generateTextWithRetry(
    getLayoutOcrModel,
    modelNames ?? ocrModelNames(config, modelName),
    parts,
    config,
  );
  const parsed = parseOcrJsonResponse(text);
  const blocks = normalizeOcrBlocks(parsed, pageStart);
  const layoutBlocks = normalizeLayoutBlocks(blocks, config, true);
  return assertNonEmptyOcrResult(layoutBlocks, inputs, pageStart, pageEnd);
}

export async function refineBlocks(
  blocks: OcrBlock[],
  modelName?: string,
): Promise<OcrBlock[]> {
  const config = getConfig();
  const parts: Part[] = [
    {
      text: `${buildStructurePrompt(blocks.length)}\n\n${JSON.stringify(blocks, null, 2)}`,
    },
  ];

  try {
    const text = await generateTextWithRetry(
      getStructureModel,
      structureModelNames(config, modelName),
      parts,
      config,
    );
    const parsed = parseOcrJsonResponse(text);
    const normalized = normalizeOcrBlocks(parsed, blocks[0]?.page ?? 1);
    return normalized.length > 0 ? normalized : blocks;
  } catch {
    return blocks;
  }
}
