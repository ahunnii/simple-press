import type { FormAnswerSnapshot } from "~/lib/forms/answers";
import {
  parseAnswersJson,
  snapshotMatchesFieldFilter,
  snapshotMatchesSearch,
} from "~/lib/forms/answers";

/**
 * In-memory search over `FormSubmission.answers`.
 *
 * `answers` and `submitterEmail` are `/// @encrypted` (prisma-field-encryption):
 * the database can filter on `businessId`/`formId`/`status`/`tags`/`submittedAt`
 * (plaintext columns), but a free-text `search` or a `fieldFilter` on the
 * decrypted answers can only be evaluated in application code, after Prisma
 * has transparently decrypted each row.
 *
 * `findMatchingSubmissions` is the shared scan: it walks matching rows in
 * ID-cursor batches (so a single `ORDER BY submittedAt` cursor race can't
 * skip or repeat a row while new submissions land mid-scan), decrypts each
 * batch's `answers`, and keeps only the rows that pass `search`/`fieldFilter`.
 * It stops once `scanCap` rows have been examined — an owner's inbox search
 * degrades to "most recent N,000 scanned" rather than locking up on an
 * unbounded table scan. `scanCapped` tells the caller whether the scan
 * stopped early (there may be older matches this run never reached).
 *
 * Pure and DB-agnostic: `fetchBatch` is injected so this can be unit tested
 * without Postgres, and the router supplies the real Prisma query.
 */

export const FORM_SUBMISSION_SCAN_CAP = 10_000;
export const FORM_SUBMISSION_SCAN_BATCH_SIZE = 500;

export type FormSubmissionScanFilter = {
  /** Case-insensitive substring match across every answer's label + value. */
  search?: string;
  /** Exact/contains match (by type) on one field's answer. */
  fieldFilter?: { fieldId: string; value: string };
};

/** One row as read off the (already-decrypted) database. */
export type FormSubmissionScanRow = {
  id: string;
  submittedAt: Date;
  status: string;
  tags: string[];
  source: string;
  /** Raw `FormSubmission.answers` JSON string (or null). */
  answers: string | null;
};

/** A scanned row with `answers` parsed into snapshots. */
export type MatchedFormSubmission = {
  id: string;
  submittedAt: Date;
  status: string;
  tags: string[];
  source: string;
  answers: FormAnswerSnapshot[];
};

export type FetchFormSubmissionBatch = (params: {
  /** Exclusive lower bound — pass the previous batch's last id, or null for the first batch. */
  cursor: string | null;
  take: number;
}) => Promise<FormSubmissionScanRow[]>;

export type FindMatchingSubmissionsResult = {
  items: MatchedFormSubmission[];
  /** True when the scan stopped at `scanCap` rows examined — there may be unscanned matches. */
  scanCapped: boolean;
};

export async function findMatchingSubmissions(
  filter: FormSubmissionScanFilter,
  fetchBatch: FetchFormSubmissionBatch,
  opts: { scanCap?: number; batchSize?: number } = {},
): Promise<FindMatchingSubmissionsResult> {
  const scanCap = opts.scanCap ?? FORM_SUBMISSION_SCAN_CAP;
  const batchSize = opts.batchSize ?? FORM_SUBMISSION_SCAN_BATCH_SIZE;

  const items: MatchedFormSubmission[] = [];
  let cursor: string | null = null;
  let scanned = 0;
  let scanCapped = false;

  for (;;) {
    const remaining = scanCap - scanned;
    if (remaining <= 0) {
      scanCapped = true;
      break;
    }
    const take = Math.min(batchSize, remaining);
    const batch = await fetchBatch({ cursor, take });
    if (batch.length === 0) break;

    for (const row of batch) {
      const answers = parseAnswersJson(row.answers);
      if (filter.search && !snapshotMatchesSearch(answers, filter.search)) {
        continue;
      }
      if (
        filter.fieldFilter &&
        !snapshotMatchesFieldFilter(
          answers,
          filter.fieldFilter.fieldId,
          filter.fieldFilter.value,
        )
      ) {
        continue;
      }
      items.push({
        id: row.id,
        submittedAt: row.submittedAt,
        status: row.status,
        tags: row.tags,
        source: row.source,
        answers,
      });
    }

    scanned += batch.length;
    cursor = batch[batch.length - 1]!.id;

    if (batch.length < take) break; // last page
    if (scanned >= scanCap) {
      scanCapped = true;
      break;
    }
  }

  return { items, scanCapped };
}
