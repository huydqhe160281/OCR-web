import { PDFParse } from "pdf-parse";
import sharp from "sharp";
import { MAX_EDGE_PX } from "./image-constants";

export async function renderPdfPagePng(
  buffer: Buffer,
  pageIndex: number,
): Promise<Buffer> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getScreenshot({
      partial: [pageIndex],
      imageBuffer: true,
      imageDataUrl: false,
    });

    const page = result.pages.find((entry) => entry.pageNumber === pageIndex);
    if (!page?.data) {
      throw new Error(`Failed to render PDF page ${pageIndex}`);
    }

    return sharp(Buffer.from(page.data))
      .resize({
        width: MAX_EDGE_PX,
        height: MAX_EDGE_PX,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();
  } finally {
    await parser.destroy();
  }
}
