import { describe, expect, it } from "vitest";

import { DREAM_CONSULTATION_STEPS_DEFAULT_ROWS } from "../about";
import { DREAM_FORM_NEXT_STEPS_DEFAULT_ROWS } from "../contact";
import { DREAM_PROCESS_STEPS_DEFAULT_ROWS } from "../homepage";
import { resolveDreamStepsList } from "./dream-steps-list";

const KEY = "dream.homepage.process-steps";
const DEFAULTS = [
  { heading: "One", body: "First." },
  { heading: "Two", body: "Second." },
];

describe("resolveDreamStepsList", () => {
  it("uses a saved list in order, with any number of rows", () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({
      heading: `Step ${i + 1}`,
      body: `Body ${i + 1}`,
    }));
    expect(resolveDreamStepsList({ [KEY]: rows }, KEY, DEFAULTS)).toEqual(rows);
  });

  it("trims text and keeps a row that has only a heading or only a description", () => {
    expect(
      resolveDreamStepsList(
        {
          [KEY]: [
            { heading: "  Only heading  ", body: "" },
            { heading: "", body: "Only body" },
          ],
        },
        KEY,
        DEFAULTS,
      ),
    ).toEqual([
      { heading: "Only heading", body: "" },
      { heading: "", body: "Only body" },
    ]);
  });

  it("drops fully blank rows", () => {
    expect(
      resolveDreamStepsList(
        {
          [KEY]: [
            { heading: " ", body: "" },
            { heading: "Keep", body: "Me" },
            {},
          ],
        },
        KEY,
        DEFAULTS,
      ),
    ).toEqual([{ heading: "Keep", body: "Me" }]);
  });

  it("falls back to the defaults when nothing usable is saved", () => {
    expect(resolveDreamStepsList(undefined, KEY, DEFAULTS)).toEqual(DEFAULTS);
    expect(resolveDreamStepsList({}, KEY, DEFAULTS)).toEqual(DEFAULTS);
    expect(resolveDreamStepsList({ [KEY]: [] }, KEY, DEFAULTS)).toEqual(
      DEFAULTS,
    );
    expect(
      resolveDreamStepsList(
        { [KEY]: [{ heading: "", body: " " }] },
        KEY,
        DEFAULTS,
      ),
    ).toEqual(DEFAULTS);
  });

  it("ignores the retired numbered keys", () => {
    expect(
      resolveDreamStepsList(
        {
          "dream.homepage.process-step-1-heading": "Legacy",
          "dream.homepage.process-step-1-body": "Legacy body",
        },
        KEY,
        DEFAULTS,
      ),
    ).toEqual(DEFAULTS);
  });

  it("resolves each page's three built-in steps from its own defaults", () => {
    for (const rows of [
      DREAM_PROCESS_STEPS_DEFAULT_ROWS,
      DREAM_CONSULTATION_STEPS_DEFAULT_ROWS,
      DREAM_FORM_NEXT_STEPS_DEFAULT_ROWS,
    ]) {
      const steps = resolveDreamStepsList({}, KEY, rows);
      expect(steps).toHaveLength(3);
      expect(steps).toEqual(
        rows.map((row) => ({ heading: row.heading, body: row.body })),
      );
    }
  });
});
