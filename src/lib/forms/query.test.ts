import { describe, expect, it, vi } from "vitest";

import type {
  FetchFormSubmissionBatch,
  FormSubmissionScanRow,
} from "~/lib/forms/query";
import { serializeAnswers } from "~/lib/forms/answers";
import { findMatchingSubmissions } from "~/lib/forms/query";

function row(
  id: string,
  overrides: Partial<FormSubmissionScanRow> = {},
): FormSubmissionScanRow {
  return {
    id,
    submittedAt: new Date("2026-01-01T00:00:00Z"),
    status: "NEW",
    tags: [],
    source: "WEB",
    answers: serializeAnswers([
      {
        fieldId: "f_email",
        label: "Email",
        type: "email",
        value: `${id}@example.com`,
      },
      {
        fieldId: "f_name",
        label: "Name",
        type: "text",
        value: id === "row_2" ? "Jane Match" : "Someone Else",
      },
    ]),
    ...overrides,
  };
}

/** Batches a fixed array of rows, ordered by id, `take`/`cursor` at a time. */
function makeFetcher(rows: FormSubmissionScanRow[]): FetchFormSubmissionBatch {
  return async ({ cursor, take }) => {
    const startIndex = cursor
      ? rows.findIndex((r) => r.id === cursor) + 1
      : 0;
    return rows.slice(startIndex, startIndex + take);
  };
}

describe("findMatchingSubmissions", () => {
  it("returns every row when no filter is given", async () => {
    const rows = [row("row_1"), row("row_2"), row("row_3")];
    const result = await findMatchingSubmissions({}, makeFetcher(rows));
    expect(result.items.map((i) => i.id)).toEqual([
      "row_1",
      "row_2",
      "row_3",
    ]);
    expect(result.scanCapped).toBe(false);
  });

  it("filters by search across labels and values, case-insensitively", async () => {
    const rows = [row("row_1"), row("row_2"), row("row_3")];
    const result = await findMatchingSubmissions(
      { search: "jane match" },
      makeFetcher(rows),
    );
    expect(result.items.map((i) => i.id)).toEqual(["row_2"]);
  });

  it("filters by a specific field's answer", async () => {
    const rows = [row("row_1"), row("row_2"), row("row_3")];
    const result = await findMatchingSubmissions(
      { fieldFilter: { fieldId: "f_name", value: "Jane Match" } },
      makeFetcher(rows),
    );
    expect(result.items.map((i) => i.id)).toEqual(["row_2"]);
  });

  it("paginates through multiple batches via the id cursor", async () => {
    const rows = Array.from({ length: 12 }, (_, i) => row(`row_${i}`));
    const fetchBatch = vi.fn(makeFetcher(rows));
    const result = await findMatchingSubmissions({}, fetchBatch, {
      batchSize: 5,
    });
    expect(result.items).toHaveLength(12);
    // 5 + 5 + 2, then a trailing empty check is unnecessary since the last
    // batch is short (< take), so the loop stops without an extra call.
    expect(fetchBatch).toHaveBeenCalledTimes(3);
  });

  it("stops at the scan cap and reports scanCapped", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => row(`row_${i}`));
    const result = await findMatchingSubmissions({}, makeFetcher(rows), {
      batchSize: 10,
      scanCap: 20,
    });
    expect(result.items).toHaveLength(20);
    expect(result.scanCapped).toBe(true);
  });

  it("does not report scanCapped when the table is exhausted exactly at the cap boundary", async () => {
    const rows = Array.from({ length: 10 }, (_, i) => row(`row_${i}`));
    const result = await findMatchingSubmissions({}, makeFetcher(rows), {
      batchSize: 10,
      scanCap: 100,
    });
    expect(result.items).toHaveLength(10);
    expect(result.scanCapped).toBe(false);
  });
});
