import type {
  CustomizationSnapshot,
  CustomizationSnapshotGroup,
} from "~/lib/customizer/types";
import { truncateCodePoints } from "~/lib/customizer/text";

/**
 * Order-side display of a stored `CustomizationSnapshot` — the admin order
 * page, packing slip, emails and the shopper's order history all render
 * these lines, so a build reads the same everywhere.
 *
 * Snapshots are frozen at purchase time: these helpers only read what was
 * stored and never consult the live definition.
 */

export type CustomizationLine = {
  /** Group name, e.g. "Charms". */
  label: string;
  /** e.g. "Heart (included), Star" or "“Amy”". */
  value: string;
  /** Charged cents per unit for this group. */
  price: number;
};

export function customizationLines(
  snapshot: CustomizationSnapshot,
): CustomizationLine[] {
  return snapshot.groups.flatMap((group): CustomizationLine[] => {
    if (group.kind === "text") {
      if (!group.text) return [];
      return [
        {
          label: group.name,
          value: `“${group.text}”`,
          price: group.price ?? 0,
        },
      ];
    }
    const selections = group.selections ?? [];
    if (selections.length === 0) return [];
    return [
      {
        label: group.name,
        value: selections
          .map((s) => (s.included ? `${s.label} (included)` : s.label))
          .join(", "),
        price: selections.reduce((sum, s) => sum + s.price, 0),
      },
    ];
  });
}

/**
 * The option lines to print under an order line, straight from the stored
 * `OrderItem.customization` JSON (any shape). `[]` for a plain line or an
 * unreadable blob. A summary-only snapshot (the webhook's degraded path,
 * when the stored build was missing) prints its summary as one "Options"
 * line, so the fulfiller still sees what was ordered.
 */
export function orderItemOptionLines(json: unknown): CustomizationLine[] {
  if (json == null) return [];
  const snapshot = readCustomizationSnapshot(json);
  if (!snapshot) return [];
  const lines = customizationLines(snapshot);
  if (lines.length > 0) return lines;
  return snapshot.summary
    ? [{ label: "Options", value: snapshot.summary, price: 0 }]
    : [];
}

/** Longest `OrderOptionsHint.summary` a list row carries. */
export const ORDER_OPTIONS_HINT_MAX_LENGTH = 80;

export type OrderOptionsHint = {
  /** How many of the order's lines carry a readable build. */
  count: number;
  /** Their snapshot summaries joined, truncated with "…". */
  summary: string;
};

/**
 * The compact "with options" hint for an order in a list (admin orders
 * table, dashboard recent orders) — rows there show counts, not lines, so
 * this says only that some lines were customized plus a short summary for
 * a tooltip. `null` when no line has a readable snapshot.
 */
export function orderOptionsHint(
  customizations: readonly unknown[],
): OrderOptionsHint | null {
  const summaries: string[] = [];
  let count = 0;
  for (const json of customizations) {
    const lines = orderItemOptionLines(json);
    if (lines.length === 0) continue;
    count += 1;
    // A blank stored summary (hand-edited data) falls back to the lines.
    const summary = readCustomizationSnapshot(json)?.summary ?? "";
    summaries.push(
      summary.length > 0
        ? summary
        : lines.map((line) => `${line.label}: ${line.value}`).join(" · "),
    );
  }
  if (count === 0) return null;
  return {
    count,
    // "; " between lines — a summary already uses " · " between groups.
    summary: truncateCodePoints(
      summaries.join("; "),
      ORDER_OPTIONS_HINT_MAX_LENGTH,
    ),
  };
}

/**
 * Narrow an `OrderItem.customization` JSON value to a v1 snapshot. Returns
 * `null` for null, an unknown version or a malformed blob, so a reader can
 * fall back to showing the plain line instead of crashing on old or
 * hand-edited data.
 */
export function readCustomizationSnapshot(
  json: unknown,
): CustomizationSnapshot | null {
  if (!isRecord(json) || json.v !== 1) return null;
  if (
    typeof json.basePrice !== "number" ||
    typeof json.addOnTotal !== "number" ||
    typeof json.summary !== "string" ||
    !Array.isArray(json.groups) ||
    !Array.isArray(json.components)
  ) {
    return null;
  }
  if (!json.groups.every(isSnapshotGroup)) return null;
  return json as CustomizationSnapshot;
}

function isSnapshotGroup(value: unknown): value is CustomizationSnapshotGroup {
  if (!isRecord(value)) return false;
  if (typeof value.name !== "string") return false;
  if (value.kind === "text")
    return value.text === undefined || typeof value.text === "string";
  if (value.kind !== "choice") return false;
  return (
    value.selections === undefined ||
    (Array.isArray(value.selections) &&
      value.selections.every(
        (s) =>
          isRecord(s) &&
          typeof s.label === "string" &&
          typeof s.price === "number",
      ))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
