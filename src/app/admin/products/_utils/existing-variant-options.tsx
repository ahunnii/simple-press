/** Derive option names and values from existing variants (e.g. Size → [S,M,L], Color → [Red]). */
export function getExistingVariantOptions(
  variants: Array<{ options: Record<string, string> }> | undefined,
): Array<{ name: string; values: string[] }> {
  if (!variants?.length) return [];
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const v of variants) {
    const opts = v.options ?? {};
    for (const k of Object.keys(opts)) {
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    }
  }
  return keys.map((name) => {
    const valueSet = new Set<string>();
    for (const v of variants) {
      const opts = v.options ?? {};
      const val = opts[name];
      if (val != null && val !== "") valueSet.add(val);
    }
    return { name, values: Array.from(valueSet) };
  });
}
