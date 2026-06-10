import mammoth from "mammoth";
import JSZip from "jszip";
import {
  BlockConfidence,
  BlockLanguage,
  MimeType,
  OcrBlockType,
  type OcrBlock,
  type OcrInput,
  type ParseResult,
} from "../types";

const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"];

function isImagePath(path: string): boolean {
  const lower = path.toLowerCase();
  return IMAGE_EXT.some((ext) => lower.endsWith(ext));
}

export async function parseDocx(buffer: Buffer): Promise<ParseResult> {
  const zip = await JSZip.loadAsync(buffer);
  const nativeBlocks: OcrBlock[] = [];
  const ocrInputs: OcrInput[] = [];

  const textResult = await mammoth.extractRawText({ buffer });
  const paragraphs = textResult.value
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  paragraphs.forEach((text, index) => {
    nativeBlocks.push({
      page: index + 1,
      type: OcrBlockType.PARAGRAPH,
      text,
      language: BlockLanguage.UNKNOWN,
      confidence: BlockConfidence.HIGH,
    });
  });

  const mediaFiles = Object.keys(zip.files).filter(
    (path) => path.startsWith("word/media/") && isImagePath(path),
  );

  await Promise.all(
    mediaFiles.map(async (path, index) => {
      const file = zip.files[path];
      if (!file) {
        return;
      }
      const data = Buffer.from(await file.async("arraybuffer"));
      const ext = path.split(".").pop()?.toLowerCase() ?? "png";
      const mimeType =
        ext === "jpg" || ext === "jpeg"
          ? MimeType.JPEG
          : ext === "webp"
            ? MimeType.WEBP
            : MimeType.PNG;

      ocrInputs.push({
        page: nativeBlocks.length + index + 1,
        mimeType,
        data,
        label: path,
      });
    }),
  );

  return {
    pageCount: Math.max(1, nativeBlocks.length + ocrInputs.length),
    nativeBlocks,
    ocrInputs,
  };
}
