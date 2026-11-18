export function normalizePrintText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[‐‑‒–—−]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/×/g, "x")
    .replace(/[·•]/g, " - ")
    .replace(/\s+/gu, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
}
