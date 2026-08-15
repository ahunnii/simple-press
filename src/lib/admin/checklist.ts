// ─────────────────────────────────────────────────────────────────────────────
// Shared admin checklist primitive
// ─────────────────────────────────────────────────────────────────────────────
//
// One scoring model for every owner-facing "how much of this have you done?"
// surface: the onboarding checklist (/admin/welcome + the dashboard's "Finish
// setting up" card) and the SEO/AEO/GEO scorecard (/admin/content/seo + the
// dashboard's search-readiness strip).
//
// Pure and dependency-free on purpose — no Prisma, no `server-only`, no React —
// so it can be imported from server components, client components, and tests
// alike.

export type ChecklistItem = {
  /** Stable identifier; surfaces look rows up by this rather than by index. */
  key: string;
  label: string;
  href: string;
  /**
   * 0..1. Binary checks are exactly 0 or 1; coverage checks are
   * `covered / total` and take partial credit.
   */
  score: number;
  /** Relative importance. Defaults to 1. */
  weight?: number;
  /** Optional human detail, e.g. "18 of 24 products". */
  detail?: string;
};

export type ChecklistSummary = {
  items: ChecklistItem[];
  /** Count of items scoring a full 1 — not a weighted number. */
  completed: number;
  total: number;
  /** Weighted completion, 0–100, rounded. */
  percent: number;
  /** Highest-weight incomplete item; ties broken by declaration order. */
  next: ChecklistItem | null;
};

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  if (score < 0) return 0;
  if (score > 1) return 1;
  return score;
}

/**
 * Roll a list of checks up into a summary.
 *
 * `percent = round(Σ(weightᵢ × scoreᵢ) / Σ(weightᵢ) × 100)`.
 *
 * With every weight at 1 and every score binary this is exactly
 * `round(completed / total × 100)` — which is what the onboarding checklist
 * computed inline before this module existed, so the extraction is
 * behaviour-preserving there.
 *
 * An empty list scores 100: there is nothing applicable left to do, which is
 * the right reading for a scorecard whose groups drop out when a feature is
 * turned off.
 */
export function summarizeChecklist(items: ChecklistItem[]): ChecklistSummary {
  let weightedScore = 0;
  let weightTotal = 0;
  let completed = 0;
  let next: ChecklistItem | null = null;
  let nextWeight = Number.NEGATIVE_INFINITY;

  for (const item of items) {
    const weight = item.weight ?? 1;
    const score = clampScore(item.score);

    weightedScore += weight * score;
    weightTotal += weight;

    if (score === 1) {
      completed += 1;
      continue;
    }

    // Strictly greater keeps the first declared item on a tie.
    if (weight > nextWeight) {
      next = item;
      nextWeight = weight;
    }
  }

  const percent =
    weightTotal === 0 ? 100 : Math.round((weightedScore / weightTotal) * 100);

  return { items, completed, total: items.length, percent, next };
}

/** Look a single row up by key. */
export function getChecklistItem(
  summary: ChecklistSummary,
  key: string,
): ChecklistItem | undefined {
  return summary.items.find((item) => item.key === key);
}

/** True when the row exists and scores a full 1. */
export function isChecklistItemComplete(
  summary: ChecklistSummary,
  key: string,
): boolean {
  const item = getChecklistItem(summary, key);
  return item !== undefined && clampScore(item.score) === 1;
}
