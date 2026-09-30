/**
 * Trims `value` and maps blank to `undefined`, so "saved value or fallback"
 * reads as a plain `??` chain. A cleared field or Settings column saves as
 * `""`, which `??` alone would treat as a real value.
 *
 * Mirrors `vii/shared/vii-non-blank.ts` — kept as a local copy rather than a
 * cross-template import so `noise` doesn't reach into another template's
 * folder for a one-line helper.
 */
export function nonBlank(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed?.length ? trimmed : undefined;
}
