import { describe, expect, it } from "vitest";

import type { TemplateListRow } from "~/lib/template-fields";

import { DEFAULT_VII_ABOUT_STEPS, DEFAULT_VII_ABOUT_TEAM } from "./about";

/**
 * Regression test for the vii `vii.about.steps` / `vii.about.team` migration
 * from hardcoded `TemplateListRow[]` constants in `about/vii-about-page.tsx`
 * (formerly `DEFAULT_STEPS` / `DEFAULT_TEAM`) into field-level `defaultRows`
 * on `about/index.tsx`, resolved back to storefront constants
 * (`DEFAULT_VII_ABOUT_STEPS` / `DEFAULT_VII_ABOUT_TEAM`) via
 * `listRowsFromDefaults`. The expected arrays below are the exact
 * pre-migration constant values — copied verbatim from `vii-about-page.tsx`
 * before it was rewritten — so this test proves the storefront output is
 * byte-for-byte identical (this test passed against the pre-migration
 * constants too, before the migration landed).
 */

const EXPECTED_STEPS: TemplateListRow[] = [
  {
    _id: "default-step-1",
    image: "",
    title: "Consultation",
    body: "We begin with a one-on-one skin analysis to understand your goals, concerns, and skin type — so every step that follows is tailored to you.",
  },
  {
    _id: "default-step-2",
    image: "",
    title: "Cleanse",
    body: "A deep double-cleanse lifts away makeup, sunscreen, and the day's buildup, leaving a fresh canvas ready to receive treatment.",
  },
  {
    _id: "default-step-3",
    image: "",
    title: "Exfoliate",
    body: "Gentle enzymatic and physical exfoliation sloughs away dull, dead cells to reveal the brighter, smoother skin underneath.",
  },
  {
    _id: "default-step-4",
    image: "",
    title: "Steam & Extract",
    body: "Warm steam softens the skin and opens the pores for careful, hygienic extractions that clear congestion without trauma.",
  },
  {
    _id: "default-step-5",
    image: "",
    title: "Mask & Massage",
    body: "A targeted treatment mask paired with a relaxing facial massage drives nutrients deep while easing tension and boosting circulation.",
  },
  {
    _id: "default-step-6",
    image: "",
    title: "Hydrate & Protect",
    body: "We seal everything in with serums, moisturizer, and SPF — locking in hydration and protecting your renewed glow.",
  },
];

const EXPECTED_TEAM: TemplateListRow[] = [
  {
    _id: "default-member-1",
    image: "",
    name: "Maya Brooks",
    role: "Licensed Esthetician",
    bio: "A corrective-skincare specialist with a gentle touch and a love for teaching clients the why behind every product.",
  },
  {
    _id: "default-member-2",
    image: "",
    name: "Devon Carter",
    role: "Esthetician & Waxing Specialist",
    bio: "Known for fast, painless service and a calm, easygoing chair-side manner that puts first-timers at ease.",
  },
  {
    _id: "default-member-3",
    image: "",
    name: "Priya Nair",
    role: "Skin Therapist",
    bio: "Brings a holistic, results-driven approach and a deep knowledge of ingredients to every custom facial.",
  },
];

describe("vii list-field defaults (moving into TemplateField.defaultRows)", () => {
  it("DEFAULT_VII_ABOUT_STEPS (vii.about.steps) matches the pre-migration copy", () => {
    expect(DEFAULT_VII_ABOUT_STEPS).toHaveLength(EXPECTED_STEPS.length);
    DEFAULT_VII_ABOUT_STEPS.forEach((row, index) => {
      expect(row).toEqual(EXPECTED_STEPS[index]);
    });
  });

  it("DEFAULT_VII_ABOUT_TEAM (vii.about.team) matches the pre-migration copy", () => {
    expect(DEFAULT_VII_ABOUT_TEAM).toHaveLength(EXPECTED_TEAM.length);
    DEFAULT_VII_ABOUT_TEAM.forEach((row, index) => {
      expect(row).toEqual(EXPECTED_TEAM[index]);
    });
  });
});
