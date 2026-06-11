const pad2 = (value: number): string => String(value).padStart(2, "0");

/** SSR-safe datetime label (UTC, fixed format — no locale drift). */
export function formatDateTimeUtc(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return (
    `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} `
    + `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())} UTC`
  );
}
