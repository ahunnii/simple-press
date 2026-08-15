import type { FieldErrors } from "react-hook-form";

export function containsFieldError(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if ("message" in value || "type" in value) return true;
  return Object.values(value).some(containsFieldError);
}

export function erroredTabsFor<T extends string>(
  errors: FieldErrors,
  tabForField: (name: string) => T,
): Set<T> {
  const tabs = new Set<T>();
  for (const [name, value] of Object.entries(errors)) {
    if (containsFieldError(value)) tabs.add(tabForField(name));
  }
  return tabs;
}

export function TabErrorDot() {
  return (
    <>
      <span
        aria-hidden="true"
        className="bg-destructive size-1.5 shrink-0 rounded-full"
      />
      <span className="sr-only">has errors</span>
    </>
  );
}
