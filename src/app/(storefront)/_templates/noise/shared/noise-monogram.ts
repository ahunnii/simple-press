/**
 * Up to two initials from the store name, for the large watermark letters
 * noise paints on its striped "no image yet" panels. These used to hardcode
 * "VN" (the design client's initials), which leaked onto every other store.
 * Falls back to "N" when there's no name to read.
 */
export function noiseMonogram(name: string | null | undefined): string {
  const words = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w));
  const initials = words
    .slice(0, 2)
    .map((w) => (/[\p{L}\p{N}]/u.exec(w)?.[0] ?? "").toUpperCase())
    .join("");
  return initials.length > 0 ? initials : "N";
}
