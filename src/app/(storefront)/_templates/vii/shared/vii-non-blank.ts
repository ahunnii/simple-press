/**
 * Trims `value` and maps blank to `undefined`, so "saved value or fallback"
 * reads as a plain `??` chain. A cleared field or Settings column saves as
 * `""`, which `??` alone would treat as a real value.
 */
export function nonBlank(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed?.length ? trimmed : undefined;
}
