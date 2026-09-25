import { describe, expect, it } from "vitest";

import { computePrecedingTone } from "./preceding-tone";

describe("computePrecedingTone", () => {
  it("returns the first visible candidate's tone, nearest-first", () => {
    expect(
      computePrecedingTone(
        [
          { visible: true, tone: "cream" },
          { visible: true, tone: "cream-deep" },
          { visible: true, tone: "forest" },
        ],
        "cream",
      ),
    ).toBe("cream");
  });

  it("skips hidden candidates and falls through to the next visible one", () => {
    expect(
      computePrecedingTone(
        [
          { visible: false, tone: "cream" },
          { visible: true, tone: "cream-deep" },
          { visible: true, tone: "forest" },
        ],
        "cream",
      ),
    ).toBe("cream-deep");
  });

  it("returns the fallback when every candidate is hidden", () => {
    expect(
      computePrecedingTone(
        [
          { visible: false, tone: "cream" },
          { visible: false, tone: "cream-deep" },
          { visible: false, tone: "forest" },
        ],
        "cream",
      ),
    ).toBe("cream");
  });

  it("returns the fallback for an empty candidate list", () => {
    expect(computePrecedingTone([], "forest")).toBe("forest");
  });

  // Homepage sustainability-band scenarios (Featured -> aboutTeaser ->
  // valueBand -> hero, nearest-first).
  describe("homepage sustainability band", () => {
    const homepageCandidates = (opts: {
      featured?: boolean;
      aboutTeaser?: boolean;
      valueBand?: boolean;
    }) => [
      { visible: opts.featured ?? false, tone: "cream" as const },
      { visible: opts.aboutTeaser ?? false, tone: "cream-deep" as const },
      { visible: opts.valueBand ?? false, tone: "forest" as const },
    ];

    it("all sections visible -> cream (Featured)", () => {
      expect(
        computePrecedingTone(
          homepageCandidates({
            featured: true,
            aboutTeaser: true,
            valueBand: true,
          }),
          "cream",
        ),
      ).toBe("cream");
    });

    it("Featured hidden/empty -> cream-deep (aboutTeaser)", () => {
      expect(
        computePrecedingTone(
          homepageCandidates({ aboutTeaser: true, valueBand: true }),
          "cream",
        ),
      ).toBe("cream-deep");
    });

    it("Featured + aboutTeaser hidden -> forest (valueBand)", () => {
      expect(
        computePrecedingTone(homepageCandidates({ valueBand: true }), "cream"),
      ).toBe("forest");
    });

    it("everything hidden -> cream (hero's own bottom fade)", () => {
      expect(computePrecedingTone(homepageCandidates({}), "cream")).toBe(
        "cream",
      );
    });
  });

  // About CTA scenarios (detroit -> nationwide -> whyBamboo -> supplier ->
  // values -> mission -> hero, nearest-first).
  describe("about CTA banner", () => {
    const aboutCandidates = (
      opts: Partial<
        Record<
          | "detroit"
          | "nationwide"
          | "whyBamboo"
          | "supplier"
          | "values"
          | "mission",
          boolean
        >
      >,
    ) => [
      { visible: opts.detroit ?? false, tone: "cream" as const },
      { visible: opts.nationwide ?? false, tone: "cream" as const },
      { visible: opts.whyBamboo ?? false, tone: "cream-deep" as const },
      { visible: opts.supplier ?? false, tone: "cream" as const },
      { visible: opts.values ?? false, tone: "cream-deep" as const },
      { visible: opts.mission ?? false, tone: "cream" as const },
    ];

    it("Detroit visible -> cream", () => {
      expect(
        computePrecedingTone(
          aboutCandidates({ detroit: true, nationwide: true }),
          "cream-deep",
        ),
      ).toBe("cream");
    });

    it("Detroit hidden, nationwide visible -> cream", () => {
      expect(
        computePrecedingTone(
          aboutCandidates({ nationwide: true }),
          "cream-deep",
        ),
      ).toBe("cream");
    });

    it("Detroit + nationwide hidden, whyBamboo visible -> cream-deep", () => {
      expect(
        computePrecedingTone(
          aboutCandidates({ whyBamboo: true }),
          "cream-deep",
        ),
      ).toBe("cream-deep");
    });

    it("only mission visible (values/supplier/whyBamboo/nationwide/detroit hidden) -> cream", () => {
      expect(
        computePrecedingTone(aboutCandidates({ mission: true }), "cream-deep"),
      ).toBe("cream");
    });

    it("everything hidden -> cream-deep (hero)", () => {
      expect(computePrecedingTone(aboutCandidates({}), "cream-deep")).toBe(
        "cream-deep",
      );
    });
  });
});
