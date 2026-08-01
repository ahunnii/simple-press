import { describe, expect, it, vi } from "vitest";

import { archivePastEvents } from "./archive";

describe("archivePastEvents", () => {
  it("archives events past their end (or start, when no end) and returns the combined count", async () => {
    const now = new Date("2026-07-31T12:00:00.000Z");

    const updateMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 3 })
      .mockResolvedValueOnce({ count: 2 });

    const db = {
      event: { updateMany },
    } as unknown as Parameters<typeof archivePastEvents>[0];

    const result = await archivePastEvents(db, now);

    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: { isArchived: false, endAt: { lt: now } },
      data: { isArchived: true },
    });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { isArchived: false, endAt: null, startAt: { lt: now } },
      data: { isArchived: true },
    });
    expect(result).toBe(5);
  });

  it("returns 0 when nothing matches either arm", async () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const db = {
      event: { updateMany },
    } as unknown as Parameters<typeof archivePastEvents>[0];

    const result = await archivePastEvents(db, now);

    expect(result).toBe(0);
  });
});
