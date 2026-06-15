/**
 * Parse Vietnamese-formatted numbers from invoice OCR cells.
 * Examples: 1.000.000 | 526.433,42 | 5,0000 | 8%
 */
export function parseVietnameseNumber(raw: string): number | null {
  let value = raw.replace(/%/g, "").trim().replace(/\s/g, "");
  if (!value || !/\d/.test(value)) {
    return null;
  }

  const commaIndex = value.lastIndexOf(",");
  const dotIndex = value.lastIndexOf(".");

  if (commaIndex >= 0 && dotIndex >= 0) {
    if (commaIndex > dotIndex) {
      value = value.replace(/\./g, "").replace(",", ".");
    } else {
      value = value.replace(/,/g, "");
    }
  } else if (commaIndex >= 0) {
    const [whole, fraction = ""] = value.split(",");
    if (fraction.length > 0 && fraction.length <= 4) {
      value = `${whole}.${fraction}`;
    } else {
      value = value.replace(/,/g, "");
    }
  } else if (dotIndex >= 0) {
    const segments = value.split(".");
    const last = segments[segments.length - 1] ?? "";
    if (segments.length > 2 || (segments.length === 2 && last.length === 3)) {
      value = value.replace(/\./g, "");
    }
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
