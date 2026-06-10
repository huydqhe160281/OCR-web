"use client";

import type { OcrBlock } from "@/lib/types";

interface PreviewPanelProps {
  blocks: OcrBlock[];
}

export function PreviewPanel({ blocks }: PreviewPanelProps) {
  if (blocks.length === 0) {
    return <p className="text-sm text-zinc-500">No extracted text yet.</p>;
  }

  return (
    <div className="max-h-[32rem] space-y-4 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      {blocks.map((block, index) => {
        const low = block.confidence === "low";
        return (
          <div
            key={`${block.page}-${index}`}
            className={low ? "rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950/30" : ""}
          >
            <div className="mb-1 flex gap-2 text-xs text-zinc-500">
              <span>Page {block.page}</span>
              <span>{block.type}</span>
              {block.language ? <span>{block.language}</span> : null}
              {low ? <span className="font-medium text-amber-700">Low confidence</span> : null}
            </div>
            {block.type === "heading" ? (
              <h3 className="text-lg font-semibold">{block.text}</h3>
            ) : block.type === "table" && block.rows ? (
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="border border-zinc-200 px-2 py-1 dark:border-zinc-700">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="whitespace-pre-wrap text-sm">{block.text}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
