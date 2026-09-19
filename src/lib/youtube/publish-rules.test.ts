import { describe, expect, it } from "vitest";

import type { PublishRules } from "./publish-rules";

import {
  DAY_CODE_LABELS,
  describePublishRules,
  emptyPublishRules,
  evaluatePublishRules,
  hasAnyRule,
  parsePhraseList,
  PUBLISH_RULES_VERSION,
  zonedDayCode,
} from "./publish-rules";

function subject(
  overrides: Partial<{ title: string; publishedAt: Date }> = {},
) {
  return {
    title: "Bamboo Hour tonight",
    publishedAt: new Date("2026-07-31T02:30:00Z"),
    ...overrides,
  };
}

function rules(overrides: Partial<PublishRules> = {}): PublishRules {
  return {
    ...emptyPublishRules(),
    ...overrides,
  };
}

describe("evaluatePublishRules", () => {
  it("passes for null rules", () => {
    expect(evaluatePublishRules(null, subject(), { timeZone: "UTC" })).toEqual({
      publish: true,
      failed: [],
    });
  });

  it("passes for undefined rules", () => {
    expect(
      evaluatePublishRules(undefined, subject(), { timeZone: "UTC" }),
    ).toEqual({ publish: true, failed: [] });
  });

  it("passes for emptyPublishRules()", () => {
    expect(
      evaluatePublishRules(emptyPublishRules(), subject(), {
        timeZone: "UTC",
      }),
    ).toEqual({ publish: true, failed: [] });
  });

  describe("titleInclude", () => {
    it("matches case-insensitive substring", () => {
      const verdict = evaluatePublishRules(
        rules({ titleInclude: ["Bamboo Hour"] }),
        subject({ title: "BAMBOO hour tonight" }),
        { timeZone: "UTC" },
      );
      expect(verdict).toEqual({ publish: true, failed: [] });
    });

    it("matches any-of with two phrases", () => {
      const verdict = evaluatePublishRules(
        rules({ titleInclude: ["Something Else", "Bamboo Hour"] }),
        subject({ title: "BAMBOO hour tonight" }),
        { timeZone: "UTC" },
      );
      expect(verdict).toEqual({ publish: true, failed: [] });
    });

    it("fails when no phrase matches", () => {
      const verdict = evaluatePublishRules(
        rules({ titleInclude: ["Nope"] }),
        subject({ title: "BAMBOO hour tonight" }),
        { timeZone: "UTC" },
      );
      expect(verdict).toEqual({ publish: false, failed: ["title-include"] });
    });
  });

  describe("titleExclude", () => {
    it("fails when a phrase is present", () => {
      const verdict = evaluatePublishRules(
        rules({ titleExclude: ["Trailer"] }),
        subject({ title: "Bamboo Hour Trailer" }),
        { timeZone: "UTC" },
      );
      expect(verdict).toEqual({ publish: false, failed: ["title-exclude"] });
    });

    it("reports title-include before title-exclude when both fail", () => {
      const verdict = evaluatePublishRules(
        rules({ titleInclude: ["Nope"], titleExclude: ["Trailer"] }),
        subject({ title: "Bamboo Hour Trailer" }),
        { timeZone: "UTC" },
      );
      expect(verdict).toEqual({
        publish: false,
        failed: ["title-include", "title-exclude"],
      });
    });
  });

  describe("weekday", () => {
    // 2026-07-31T02:30:00Z is Friday in UTC, Thursday in America/Detroit (EDT, UTC-4).
    const fridayUtc = new Date("2026-07-31T02:30:00Z");

    it("passes weekdays: [thu] under Detroit", () => {
      const verdict = evaluatePublishRules(
        rules({ weekdays: ["thu"] }),
        subject({ publishedAt: fridayUtc }),
        { timeZone: "America/Detroit" },
      );
      expect(verdict).toEqual({ publish: true, failed: [] });
    });

    it("fails weekdays: [fri] under Detroit", () => {
      const verdict = evaluatePublishRules(
        rules({ weekdays: ["fri"] }),
        subject({ publishedAt: fridayUtc }),
        { timeZone: "America/Detroit" },
      );
      expect(verdict).toEqual({ publish: false, failed: ["weekday"] });
    });

    it("passes weekdays: [fri] under Asia/Tokyo", () => {
      const verdict = evaluatePublishRules(
        rules({ weekdays: ["fri"] }),
        subject({ publishedAt: fridayUtc }),
        { timeZone: "Asia/Tokyo" },
      );
      expect(verdict).toEqual({ publish: true, failed: [] });
    });

    it("treats an invalid zone as UTC without throwing", () => {
      expect(() =>
        evaluatePublishRules(
          rules({ weekdays: ["fri"] }),
          subject({ publishedAt: fridayUtc }),
          { timeZone: "Not/AZone" },
        ),
      ).not.toThrow();

      const verdict = evaluatePublishRules(
        rules({ weekdays: ["fri"] }),
        subject({ publishedAt: fridayUtc }),
        { timeZone: "Not/AZone" },
      );
      expect(verdict).toEqual({ publish: true, failed: [] });
    });
  });

  it("ANDs clauses: title passes but weekday fails", () => {
    const verdict = evaluatePublishRules(
      rules({ titleInclude: ["Bamboo Hour"], weekdays: ["fri"] }),
      subject({
        title: "Bamboo Hour tonight",
        publishedAt: new Date("2026-07-31T02:30:00Z"),
      }),
      { timeZone: "America/Detroit" },
    );
    expect(verdict).toEqual({ publish: false, failed: ["weekday"] });
  });
});

describe("zonedDayCode", () => {
  const fridayUtc = new Date("2026-07-31T02:30:00Z");

  it("returns thu for Detroit", () => {
    expect(zonedDayCode(fridayUtc, "America/Detroit")).toBe("thu");
  });

  it("returns fri for Tokyo", () => {
    expect(zonedDayCode(fridayUtc, "Asia/Tokyo")).toBe("fri");
  });

  it("returns fri for UTC", () => {
    expect(zonedDayCode(fridayUtc, "UTC")).toBe("fri");
  });

  it("returns fri for a bad zone (falls back to UTC)", () => {
    expect(zonedDayCode(fridayUtc, "Not/AZone")).toBe("fri");
  });
});

describe("parsePhraseList", () => {
  it("trims, drops empties, and handles a trailing comma", () => {
    expect(parsePhraseList("Bamboo Hour, trailer,, Trailer ")).toEqual([
      "Bamboo Hour",
      "trailer",
    ]);
  });

  it("dedupes case-insensitively, keeping the first occurrence's casing", () => {
    expect(parsePhraseList("Trailer, TRAILER, trailer")).toEqual(["Trailer"]);
  });

  it("returns [] for an empty string", () => {
    expect(parsePhraseList("")).toEqual([]);
  });

  it("returns [] for a string of only commas/whitespace", () => {
    expect(parsePhraseList(" , , ,")).toEqual([]);
  });
});

describe("hasAnyRule", () => {
  it("is false for null", () => {
    expect(hasAnyRule(null)).toBe(false);
  });

  it("is false for undefined", () => {
    expect(hasAnyRule(undefined)).toBe(false);
  });

  it("is false for emptyPublishRules()", () => {
    expect(hasAnyRule(emptyPublishRules())).toBe(false);
  });

  it("is true with only titleInclude set", () => {
    expect(hasAnyRule(rules({ titleInclude: ["x"] }))).toBe(true);
  });

  it("is true with only titleExclude set", () => {
    expect(hasAnyRule(rules({ titleExclude: ["x"] }))).toBe(true);
  });

  it("is true with only weekdays set", () => {
    expect(hasAnyRule(rules({ weekdays: ["mon"] }))).toBe(true);
  });
});

describe("describePublishRules", () => {
  it("is null for null", () => {
    expect(describePublishRules(null)).toBeNull();
  });

  it("is null for empty rules", () => {
    expect(describePublishRules(emptyPublishRules())).toBeNull();
  });

  it("builds the exact full example", () => {
    const summary = describePublishRules(
      rules({
        titleInclude: ["Bamboo Hour"],
        titleExclude: ["Trailer"],
        weekdays: ["thu", "tue"],
      }),
    );
    expect(summary).toBe(
      'title contains "Bamboo Hour" · not "Trailer" · Tue, Thu',
    );
  });

  it("joins two include phrases with or", () => {
    const summary = describePublishRules(rules({ titleInclude: ["A", "B"] }));
    expect(summary).toBe('title contains "A" or "B"');
  });
});

describe("sanity: version + labels", () => {
  it("PUBLISH_RULES_VERSION is 1", () => {
    expect(PUBLISH_RULES_VERSION).toBe(1);
  });

  it("DAY_CODE_LABELS maps every DayCode", () => {
    expect(DAY_CODE_LABELS).toEqual({
      mon: "Mon",
      tue: "Tue",
      wed: "Wed",
      thu: "Thu",
      fri: "Fri",
      sat: "Sat",
      sun: "Sun",
    });
  });
});
