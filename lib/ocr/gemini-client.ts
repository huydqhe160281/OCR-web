import {
  GoogleGenerativeAI,
  type GenerativeModel,
  type Part,
} from "@google/generative-ai";
import { getConfig } from "../config";
import {
  BlockConfidence,
  BlockLanguage,
  OcrBlockType,
  type OcrBlock,
  type OcrInput,
} from "../types";
import {
  OCR_SYSTEM_PROMPT,
  buildOcrUserPrompt,
  parseOcrJsonResponse,
} from "./prompts";

function getModel(modelName: string): GenerativeModel {
  const config = getConfig();
  const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: OCR_SYSTEM_PROMPT,
  });
}

function isRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("429") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("timeout") ||
    message.includes("Timeout") ||
    message.includes("503")
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

  return { page, type, level, text, language, confidence, rows };
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

export async function ocrInputs(
  inputs: OcrInput[],
  pageStart: number,
  pageEnd: number,
  modelName?: string,
): Promise<OcrBlock[]> {
  const config = getConfig();
  const model = getModel(modelName ?? config.GEMINI_OCR_MODEL);
  const parts: Part[] = [
    { text: buildOcrUserPrompt(pageStart, pageEnd, inputs[0]?.label) },
    ...inputs.map(inputToPart),
  ];

  let lastError: unknown;
  for (let attempt = 0; attempt <= config.retryBackoffMs.length; attempt++) {
    try {
      const result = await model.generateContent(parts);
      const text = result.response.text();
      const parsed = parseOcrJsonResponse(text);
      return normalizeOcrBlocks(parsed, pageStart);
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt >= config.retryBackoffMs.length) {
        throw error;
      }
      await sleep(config.retryBackoffMs[attempt] ?? 1000);
    }
  }

  throw lastError;
}

export async function refineBlocks(
  blocks: OcrBlock[],
  modelName?: string,
): Promise<OcrBlock[]> {
  const config = getConfig();
  const model = getModel(modelName ?? config.GEMINI_STRUCTURE_MODEL);
  const parts: Part[] = [
    {
      text: `Refine these OCR blocks:\n${JSON.stringify(blocks, null, 2)}`,
    },
  ];

  const result = await model.generateContent(parts);
  const parsed = parseOcrJsonResponse(result.response.text());
  const normalized = normalizeOcrBlocks(parsed, blocks[0]?.page ?? 1);
  return normalized.length > 0 ? normalized : blocks;
}
