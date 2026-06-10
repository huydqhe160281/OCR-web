import sharp from "sharp";
import { MimeType, type OcrInput, type ParseResult } from "../types";

const MAX_EDGE_PX = 2048;

export async function parseImage(
  buffer: Buffer,
  mimeType: string,
): Promise<ParseResult> {
  const normalized = await sharp(buffer)
    .rotate()
    .resize({
      width: MAX_EDGE_PX,
      height: MAX_EDGE_PX,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  const ocrInputs: OcrInput[] = [
    {
      page: 1,
      mimeType: mimeType === MimeType.WEBP ? MimeType.PNG : mimeType,
      data: normalized,
      label: "image-page-1",
    },
  ];

  return {
    pageCount: 1,
    nativeBlocks: [],
    ocrInputs,
  };
}
