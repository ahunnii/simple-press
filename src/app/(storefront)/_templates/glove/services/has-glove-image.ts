/** A real owner image (blank and the stock placeholder both count as none). */
export function hasGloveImage(src: string | null | undefined): src is string {
  const value = src?.trim() ?? "";
  return value.length > 0 && !value.endsWith("/placeholder.svg");
}
