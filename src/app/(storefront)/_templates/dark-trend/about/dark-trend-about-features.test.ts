import { describe, expect, it } from "vitest";

import { DEFAULT_DARK_TREND_FEATURES } from ".";
import {
  DARK_TREND_ABOUT_FEATURES_KEY,
  resolveDarkTrendAboutFeatures,
} from "./dark-trend-about-features";

/**
 * The live store's pre-list numbered keys, verbatim. Its About page must keep
 * rendering exactly these cards after the built-in defaults went neutral.
 */
const LEGACY_FIELDS = {
  "dark-trend.about.feature-1-header": "Our Mission",
  "dark-trend.about.feature-1-description":
    "Creating alternative clothing that celebrates individuality and empowers Black, LGBTQ+, and POC communities to express their unique identities.",
  "dark-trend.about.feature-2-header": "Our Values",
  "dark-trend.about.feature-2-description":
    "We value diversity, creativity, and community, ensuring our designs resonate with underrepresented voices and foster a safe, inclusive shopping environment for everyone.",
  "dark-trend.about.feature-3-header": "Why Us?",
  "dark-trend.about.feature-3-description":
    "We don't just make you look beautiful, handsome, and gear to show off, we'll make you feel like the coolest!",
};

describe("resolveDarkTrendAboutFeatures", () => {
  it("builds rows from the legacy feature-N keys when no list is saved", () => {
    expect(resolveDarkTrendAboutFeatures(LEGACY_FIELDS)).toEqual([
      {
        title: "Our Mission",
        description: LEGACY_FIELDS["dark-trend.about.feature-1-description"],
      },
      {
        title: "Our Values",
        description: LEGACY_FIELDS["dark-trend.about.feature-2-description"],
      },
      {
        title: "Why Us?",
        description: LEGACY_FIELDS["dark-trend.about.feature-3-description"],
      },
    ]);
  });

  it("keeps a legacy slot when only one half is set and skips blank slots", () => {
    expect(
      resolveDarkTrendAboutFeatures({
        "dark-trend.about.feature-1-header": "  ",
        "dark-trend.about.feature-1-description": "",
        "dark-trend.about.feature-2-description": "Body only",
        "dark-trend.about.feature-4-header": "Fourth",
      }),
    ).toEqual([
      { title: "", description: "Body only" },
      { title: "Fourth", description: "" },
    ]);
  });

  it("prefers a saved list over the legacy keys", () => {
    expect(
      resolveDarkTrendAboutFeatures({
        ...LEGACY_FIELDS,
        [DARK_TREND_ABOUT_FEATURES_KEY]: [
          { title: "Saved", description: "From the list" },
        ],
      }),
    ).toEqual([{ title: "Saved", description: "From the list" }]);
  });

  it("falls back to the built-in cards for a saved but empty list", () => {
    expect(
      resolveDarkTrendAboutFeatures({
        ...LEGACY_FIELDS,
        [DARK_TREND_ABOUT_FEATURES_KEY]: [],
      }),
    ).toEqual(DEFAULT_DARK_TREND_FEATURES);
  });

  it("falls back to the neutral built-in cards when nothing is saved", () => {
    expect(resolveDarkTrendAboutFeatures(undefined)).toEqual(
      DEFAULT_DARK_TREND_FEATURES,
    );
    expect(resolveDarkTrendAboutFeatures({})).toEqual(
      DEFAULT_DARK_TREND_FEATURES,
    );
    expect(DEFAULT_DARK_TREND_FEATURES).toHaveLength(3);
    expect(DEFAULT_DARK_TREND_FEATURES.map((row) => row.title)).not.toContain(
      "Our Mission",
    );
  });
});
