import {
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { sortLayoutBlocks } from "../ocr/layout-normalize";
import {
  LayoutRegion,
  OcrBlockType,
  type OcrBlock,
} from "../types";

const BAND_Y_QUANTUM = 0.05;

function headingLevel(level?: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  switch (level) {
    case 1:
      return HeadingLevel.HEADING_1;
    case 2:
      return HeadingLevel.HEADING_2;
    case 3:
      return HeadingLevel.HEADING_3;
    case 4:
      return HeadingLevel.HEADING_4;
    case 5:
      return HeadingLevel.HEADING_5;
    case 6:
      return HeadingLevel.HEADING_6;
    default:
      return HeadingLevel.HEADING_2;
  }
}

function bandKey(block: OcrBlock): string {
  const y = block.bbox?.y ?? 0;
  const bucket = Math.floor(y / BAND_Y_QUANTUM);
  return `${block.page}-${bucket}`;
}

function paragraphFromBlock(block: OcrBlock): Paragraph {
  if (block.type === OcrBlockType.HEADING) {
    return new Paragraph({
      text: block.text,
      heading: headingLevel(block.level),
    });
  }

  const runs = block.text.split("\n").flatMap((line, index, arr) => {
    const parts: TextRun[] = [new TextRun(line)];
    if (index < arr.length - 1) {
      parts.push(new TextRun({ break: 1 }));
    }
    return parts;
  });
  return new Paragraph({ children: runs });
}

function tableFromBlock(block: OcrBlock): Table {
  const rows = block.rows ?? [];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (row) =>
        new TableRow({
          children: row.map(
            (cell) =>
              new TableCell({
                children: [new Paragraph({ text: cell })],
              }),
          ),
        }),
    ),
  });
}

function invisibleBorders() {
  return {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  };
}

function regionCell(blocks: OcrBlock[]): TableCell {
  const children = blocks.length > 0 ? blocks.map(paragraphFromBlock) : [new Paragraph("")];
  return new TableCell({
    borders: invisibleBorders(),
    children,
  });
}

function buildRegionBandTable(bandBlocks: OcrBlock[]): Table {
  const left = bandBlocks.filter((block) => block.region === LayoutRegion.LEFT);
  const center = bandBlocks.filter((block) => block.region === LayoutRegion.CENTER);
  const right = bandBlocks.filter((block) => block.region === LayoutRegion.RIGHT);
  const unassigned = bandBlocks.filter((block) => !block.region);

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          regionCell([...left, ...unassigned.filter((_, index) => index % 3 === 0)]),
          regionCell([...center, ...unassigned.filter((_, index) => index % 3 === 1)]),
          regionCell([...right, ...unassigned.filter((_, index) => index % 3 === 2)]),
        ],
      }),
    ],
  });
}

export async function buildLayoutDocxBuffer(blocks: OcrBlock[]): Promise<Buffer> {
  const sorted = sortLayoutBlocks(blocks);
  const children: Array<Paragraph | Table> = [];
  let band: OcrBlock[] = [];
  let currentBandKey = "";

  const flushBand = (): void => {
    if (band.length === 0) {
      return;
    }
    children.push(buildRegionBandTable(band));
    band = [];
  };

  for (const block of sorted) {
    if (block.type === OcrBlockType.TABLE && block.rows && block.rows.length >= 2) {
      flushBand();
      children.push(tableFromBlock(block));
      continue;
    }

    const key = bandKey(block);
    if (currentBandKey && key !== currentBandKey) {
      flushBand();
    }
    currentBandKey = key;
    band.push(block);
  }

  flushBand();

  const doc = new Document({
    sections: [{ children }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}
