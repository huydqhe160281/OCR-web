interface ProgressBarProps {
  current: number;
  total: number;
}

export function ProgressBar({ current, total }: ProgressBarProps) {
  const safeTotal = total > 0 ? total : 1;
  const pct = Math.min(100, Math.round((current / safeTotal) * 100));

  return (
    <div className="w-full max-w-xs">
      <div className="mb-1 flex justify-between text-xs text-zinc-500">
        <span>
          {current}/{total || "?"} pages
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
