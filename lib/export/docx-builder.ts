import {
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
import { OcrBlockType, type OcrBlock } from "../types";

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

function blockToDocxChildren(block: OcrBlock): Paragraph | Table {
  if (block.type === OcrBlockType.TABLE && block.rows && block.rows.length > 0) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: block.rows.map(
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

export async function buildDocxBuffer(blocks: OcrBlock[]): Promise<Buffer> {
  const children = blocks.map(blockToDocxChildren);
  const doc = new Document({
    sections: [{ children }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}
