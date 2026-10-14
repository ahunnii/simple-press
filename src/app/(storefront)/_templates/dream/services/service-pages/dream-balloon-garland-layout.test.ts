import { describe, expect, it } from "vitest";

import {
  assignGarlandColors,
  balloonFinishFromLabel,
  balloonHex,
  buildGarlandModel,
  GARLAND_SLOT_SPEC,
  garlandNeighbours,
  garlandSeed,
  garlandSlots,
  mulberry32,
  NEUTRAL_BALLOON_HEX,
} from "./dream-balloon-garland-layout";

const slots = garlandSlots();

function counts(assignment: number[], size: number): number[] {
  const out = Array.from({ length: size }, () => 0);
  for (const c of assignment) out[c]!++;
  return out;
}

describe("garland layout", () => {
  it("has 21 slots inside the 640×360 frame", () => {
    expect(slots).toHaveLength(GARLAND_SLOT_SPEC.length);
    expect(slots).toHaveLength(21);
    for (const s of slots) {
      expect(s.x - s.r).toBeGreaterThan(0);
      expect(s.x + s.r).toBeLessThan(640);
      expect(s.y - s.r).toBeGreaterThan(0);
      expect(s.y + s.r * 1.1).toBeLessThan(360);
    }
  });

  it("mulberry32 is deterministic", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 5 }, a);
    const seqB = Array.from({ length: 5 }, b);
    expect(seqA).toEqual(seqB);
    for (const v of seqA) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("seeds ignore palette order but follow the shuffle counter", () => {
    expect(garlandSeed(["a", "b", "c"])).toBe(garlandSeed(["c", "a", "b"]));
    expect(garlandSeed(["a", "b"], 0)).not.toBe(garlandSeed(["a", "b"], 1));
  });

  it("assigns the same garland for the same palette + shuffle", () => {
    const seed = garlandSeed(["x", "y", "z", "w"], 3);
    expect(assignGarlandColors(slots, 4, seed)).toEqual(
      assignGarlandColors(slots, 4, seed),
    );
  });

  it("returns all -1 for an empty palette", () => {
    expect(assignGarlandColors(slots, 0, 1)).toEqual(slots.map(() => -1));
  });

  it.each([1, 2, 3, 4, 5, 6, 7, 12])(
    "balances quotas for %i colors (every slot filled, counts differ by ≤ 1)",
    (n) => {
      for (let shuffle = 0; shuffle < 10; shuffle++) {
        const ids = Array.from({ length: n }, (_, i) => `c${i}`);
        const assignment = assignGarlandColors(
          slots,
          n,
          garlandSeed(ids, shuffle),
        );
        expect(assignment.every((c) => c >= 0 && c < n)).toBe(true);
        const c = counts(assignment, n);
        expect(Math.max(...c) - Math.min(...c)).toBeLessThanOrEqual(1);
        expect(c.reduce((a, b) => a + b, 0)).toBe(21);
      }
    },
  );

  it("gives every color a large balloon when there are ≤ 4", () => {
    const larges = slots.filter((s) => s.size === "large").map((s) => s.index);
    for (const n of [2, 3, 4]) {
      for (let shuffle = 0; shuffle < 10; shuffle++) {
        const ids = Array.from({ length: n }, (_, i) => `c${i}`);
        const a = assignGarlandColors(slots, n, garlandSeed(ids, shuffle));
        const largeColors = new Set(larges.map((i) => a[i]));
        expect(largeColors.size).toBe(n);
      }
    }
  });

  it("keeps the closest neighbours different when there are enough colors", () => {
    const neighbours = garlandNeighbours(slots);
    // Overlapping balloons (weight > 1: centers closer than the sum of the
    // radii) sharing a color, counted once per pair.
    const overlapClashes = (a: number[]) => {
      let clashes = 0;
      for (const slot of slots) {
        for (const nb of neighbours[slot.index]!) {
          if (nb.index > slot.index && nb.weight > 1) {
            if (a[slot.index] === a[nb.index]) clashes++;
          }
        }
      }
      return clashes;
    };
    for (const n of [3, 4, 5, 6]) {
      for (let shuffle = 0; shuffle < 50; shuffle++) {
        const ids = Array.from({ length: n }, (_, i) => `p${i}`);
        const a = assignGarlandColors(slots, n, garlandSeed(ids, shuffle));
        // From 4 colors up no two overlapping balloons ever match; with 3
        // (7 balloons each) a couple of touches are unavoidable.
        expect(overlapClashes(a)).toBeLessThanOrEqual(n >= 4 ? 0 : 2);
      }
    }
  });

  it("reads finishes from group labels by keyword", () => {
    expect(balloonFinishFromLabel("Pearl")).toBe("pearl");
    expect(balloonFinishFromLabel("Platinum finish")).toBe("platinum");
    expect(balloonFinishFromLabel("CRYSTAL")).toBe("crystal");
    expect(balloonFinishFromLabel("Retro tones")).toBe("retro");
    expect(balloonFinishFromLabel("Luster")).toBe("luster");
    expect(balloonFinishFromLabel("Pastel")).toBe("pastel");
    expect(balloonFinishFromLabel("Standard")).toBe("standard");
    expect(balloonFinishFromLabel("Latex")).toBe("standard");
    expect(balloonFinishFromLabel(undefined)).toBe("standard");
  });

  it("falls back to the neutral hex for missing or malformed colors", () => {
    expect(balloonHex(undefined)).toBe(NEUTRAL_BALLOON_HEX);
    expect(balloonHex("red")).toBe(NEUTRAL_BALLOON_HEX);
    expect(balloonHex("#AABBCC")).toBe("#aabbcc");
  });

  it("builds a namespaced, titled model", () => {
    const empty = buildGarlandModel([], { uid: "u1", max: 6 });
    expect(empty.kind).toBe("empty");
    expect(empty.title).toContain("up to 6");

    const model = buildGarlandModel(
      [
        { id: "a", label: "Pearl Gold", hex: "#d4af37", finish: "pearl" },
        { id: "b", label: "Crystal Blue", finish: "crystal" },
        { id: "c", label: "Platinum Pink", hex: "#95778c", finish: "platinum" },
      ],
      { uid: "u1" },
    );
    if (model.kind !== "filled") throw new Error("expected a filled garland");
    expect(model.title).toBe(
      "Balloon garland sketch in Pearl Gold, Crystal Blue and Platinum Pink",
    );
    expect(model.balloons).toHaveLength(21);
    const ids = model.defs.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith("u1-"))).toBe(true);
    // Missing hex → neutral body.
    expect(model.balloons.some((b) => b.hex === NEUTRAL_BALLOON_HEX)).toBe(
      true,
    );
  });
});
