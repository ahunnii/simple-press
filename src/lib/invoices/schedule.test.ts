import { describe, expect, it } from "vitest";

import { digestWindow } from "./schedule";

const at = (iso: string) => new Date(iso);

describe("digestWindow", () => {
  const zone = "America/Detroit";

  it("is not due before 08:00 local on Monday", () => {
    // Mon 2026-09-21 07:59 EDT
    expect(digestWindow(at("2026-09-21T11:59:00Z"), zone)).toEqual({
      due: false,
      weekKey: "2026-09-21",
    });
  });

  it("is due from 08:00 local on Monday", () => {
    expect(digestWindow(at("2026-09-21T12:00:00Z"), zone)).toEqual({
      due: true,
      weekKey: "2026-09-21",
    });
  });

  it("stays due (catch-up) for the rest of the week with the same key", () => {
    for (const iso of [
      "2026-09-22T09:00:00Z", // Tue
      "2026-09-25T20:00:00Z", // Fri
      "2026-09-28T03:59:00Z", // Sun 23:59 EDT
    ]) {
      expect(digestWindow(at(iso), zone)).toEqual({
        due: true,
        weekKey: "2026-09-21",
      });
    }
  });

  it("rolls to the next week's key at local Monday midnight", () => {
    // Mon 2026-09-28 00:00 EDT
    expect(digestWindow(at("2026-09-28T04:00:00Z"), zone)).toEqual({
      due: false,
      weekKey: "2026-09-28",
    });
  });

  it("tracks 08:00 local across the fall-back DST change", () => {
    // Before: Mon 2026-10-26 08:00 EDT = 12:00Z.
    expect(digestWindow(at("2026-10-26T11:59:00Z"), zone).due).toBe(false);
    expect(digestWindow(at("2026-10-26T12:00:00Z"), zone).due).toBe(true);
    // After (Nov 1): Mon 2026-11-02 08:00 EST = 13:00Z; 12:30Z is 07:30 local.
    expect(digestWindow(at("2026-11-02T12:30:00Z"), zone)).toEqual({
      due: false,
      weekKey: "2026-11-02",
    });
    expect(digestWindow(at("2026-11-02T13:00:00Z"), zone).due).toBe(true);
    // The DST Sunday itself still belongs to the week of Oct 26.
    expect(digestWindow(at("2026-11-01T15:00:00Z"), zone).weekKey).toBe(
      "2026-10-26",
    );
  });

  it("tracks 08:00 local across the spring-forward DST change", () => {
    // Sun 2026-03-08 is the change; Mon 2026-03-09 08:00 EDT = 12:00Z.
    expect(digestWindow(at("2026-03-08T12:00:00Z"), zone).weekKey).toBe(
      "2026-03-02",
    );
    expect(digestWindow(at("2026-03-09T11:59:00Z"), zone)).toEqual({
      due: false,
      weekKey: "2026-03-09",
    });
    expect(digestWindow(at("2026-03-09T12:00:00Z"), zone).due).toBe(true);
  });

  it("uses the local week in zones far from UTC", () => {
    // Mon 2026-09-21 08:00 in Kiritimati (UTC+14) is Sun 18:00Z.
    expect(
      digestWindow(at("2026-09-20T18:00:00Z"), "Pacific/Kiritimati"),
    ).toEqual({ due: true, weekKey: "2026-09-21" });
    // …while in Pago Pago (UTC−11) that same instant is Sun 07:00 of the prior week.
    expect(
      digestWindow(at("2026-09-20T18:00:00Z"), "Pacific/Pago_Pago"),
    ).toEqual({ due: true, weekKey: "2026-09-14" });
  });

  it("falls back to UTC for an invalid zone", () => {
    expect(digestWindow(at("2026-09-21T08:00:00Z"), "Not/AZone")).toEqual({
      due: true,
      weekKey: "2026-09-21",
    });
    expect(digestWindow(at("2026-09-21T07:59:00Z"), "Not/AZone").due).toBe(
      false,
    );
  });
});
