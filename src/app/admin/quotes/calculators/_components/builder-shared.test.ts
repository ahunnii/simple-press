import { describe, expect, it } from "vitest";

import type {
  CalculatorDefinitionInput,
  OptionInput,
  QuestionInput,
  ScreenInput,
} from "./builder-shared";

import {
  applyTypeChange,
  clearAllTabIds,
  commonTabIds,
  convertQuestionType,
  describeTypeChangeImpact,
  makeEmptyDefinition,
  makeQuestion,
  makeScreen,
  makeTab,
  QUESTION_TYPE_ORDER,
  stripTabId,
} from "./builder-shared";

/**
 * The pure half of the quote calculator builder.
 *
 * Everything under test here decides what happens to work an owner has ALREADY
 * done: which tabs a question is asked on, and what survives when they change a
 * question's type. Both are destructive by nature — a wrong answer silently
 * un-asks a question in front of every visitor, or orphans an option id that a
 * show-if still points at — and neither is visible in the builder until a
 * customer hits the form. Hence the exhaustive conversion matrix.
 */

// ─── Fixtures ───────────────────────────────────────────────────────────────

function optionOf(id: string, label: string, value: number): OptionInput {
  return { id, label, value, icon: null };
}

function baseOf(id: string, title: string) {
  return {
    id,
    title,
    description: `${id} helper text`,
    required: true,
    showIf: null,
    tabIds: [] as string[],
  };
}

function choiceQuestion(
  id: string,
  title: string,
  variableName: string,
): QuestionInput {
  return {
    ...baseOf(id, title),
    type: "choice",
    variableName,
    hiddenDefault: 3,
    options: [
      optionOf(`${id}1`, "First", 100),
      optionOf(`${id}2`, "Second", 200),
    ],
  };
}

function textQuestion(id: string, title: string): QuestionInput {
  return { ...baseOf(id, title), type: "text" };
}

function zipQuestion(id: string, title: string): QuestionInput {
  return { ...baseOf(id, title), type: "zip" };
}

/**
 * A(choice, variable `a`, options A1/A2) → B(text, shown when A = A1)
 * C(choice, shown when A = A2) → Z1/Z2(zip) paired by distance `d`.
 * Formula references both `a` and `d`.
 */
function fixtureDefinition(): CalculatorDefinitionInput {
  const a = choiceQuestion("A", "Move type", "a");
  const b: QuestionInput = {
    ...textQuestion("B", "Anything else?"),
    showIf: { questionId: "A", optionId: "A1" },
  };
  const c: QuestionInput = {
    ...choiceQuestion("C", "Crew size", "c"),
    showIf: { questionId: "A", optionId: "A2" },
  };

  return {
    ...makeEmptyDefinition(),
    screens: [
      makeScreen([a, b]),
      makeScreen([
        c,
        zipQuestion("Z1", "From ZIP"),
        zipQuestion("Z2", "To ZIP"),
      ]),
    ],
    distances: [
      {
        id: "d",
        variableName: "d",
        fromQuestionId: "Z1",
        toQuestionId: "Z2",
        hiddenDefault: 0,
        roadFactor: 1.25,
      },
    ],
    formula: "a * 10 + d",
  };
}

function questionsWithTabIds(
  ...lists: (string[] | undefined)[]
): QuestionInput[] {
  return lists.map((tabIds, index) => ({
    ...textQuestion(`q${index}`, `Question ${index}`),
    tabIds,
  }));
}

function screensWithTabIds(...lists: (string[] | undefined)[]): ScreenInput[] {
  return [makeScreen(questionsWithTabIds(...lists))];
}

function findQuestion(
  screens: readonly ScreenInput[],
  id: string,
): QuestionInput | undefined {
  for (const screen of screens) {
    for (const question of screen.questions) {
      if (question.id === id) return question;
    }
  }
  return undefined;
}

// ─── Factories ──────────────────────────────────────────────────────────────

describe("factories", () => {
  it("gives every new question an empty tabIds list", () => {
    // `[]` is "asked on every tab", which is what a brand-new question must be
    // — including on a calculator with no tabs at all.
    for (const type of QUESTION_TYPE_ORDER) {
      expect(makeQuestion(type).tabIds).toEqual([]);
    }
  });

  it("starts a new calculator with no tab switcher", () => {
    const definition = makeEmptyDefinition();
    expect(definition.tabs).toEqual([]);
    expect(definition.tabsPrompt).toBe("");
  });

  it("makes a tab that defers to the root formula", () => {
    const tab = makeTab();
    expect(tab.label).toBe("");
    expect(tab.description).toBe("");
    // `null`, never `""` — an empty string reads as "override with the empty
    // formula", which the schema then refuses.
    expect(tab.formula).toBeNull();
    expect(typeof tab.id).toBe("string");
    expect(tab.id).not.toBe(makeTab().id);
  });
});

// ─── Tabs ───────────────────────────────────────────────────────────────────

describe("commonTabIds", () => {
  it("returns the shared list when every question agrees", () => {
    expect(commonTabIds(questionsWithTabIds([], []))).toEqual([]);
    expect(commonTabIds(questionsWithTabIds(["a"], ["a"]))).toEqual(["a"]);
  });

  it("ignores ordering — membership is a set", () => {
    const result = commonTabIds(questionsWithTabIds(["a", "b"], ["b", "a"]));
    expect(result).not.toBe("mixed");
    expect([...(result as string[])].sort()).toEqual(["a", "b"]);
  });

  it("reports mixed when the questions disagree", () => {
    expect(commonTabIds(questionsWithTabIds(["a"], []))).toBe("mixed");
    expect(commonTabIds(questionsWithTabIds(["a"], ["a", "b"]))).toBe("mixed");
    expect(commonTabIds(questionsWithTabIds(["a"], ["b"]))).toBe("mixed");
  });

  it("treats an absent list as every tab", () => {
    // On the input side `tabIds` is optional, so a form that has never touched
    // it holds `undefined` — which must read the same as `[]`, not as a third
    // state that makes the picker say "mixed" on an untouched screen.
    expect(commonTabIds(questionsWithTabIds(undefined, []))).toEqual([]);
  });

  it("returns every-tab for a screen with no questions", () => {
    expect(commonTabIds([])).toEqual([]);
  });
});

describe("stripTabId", () => {
  it("removes the id from every question that lists it", () => {
    const screens = screensWithTabIds(["a", "b"], ["b"], []);
    const result = stripTabId(screens, "b");
    expect(result[0]?.questions.map((question) => question.tabIds)).toEqual([
      ["a"],
      [],
      [],
    ]);
  });

  it("does not mutate the input and touches nothing but tabIds", () => {
    const screens = screensWithTabIds(["a", "b"], ["b"]);
    const before = JSON.stringify(screens);
    const result = stripTabId(screens, "b");
    expect(JSON.stringify(screens)).toBe(before);

    const source = screens[0]?.questions[0];
    const changed = result[0]?.questions[0];
    expect(changed?.id).toBe(source?.id);
    expect(changed?.title).toBe(source?.title);
    expect(changed?.type).toBe(source?.type);
    expect(changed?.required).toBe(source?.required);
  });

  it("keeps untouched questions by identity", () => {
    const screens = screensWithTabIds(["a"], ["b"]);
    const result = stripTabId(screens, "b");
    expect(result[0]?.questions[0]).toBe(screens[0]?.questions[0]);
    expect(result[0]?.questions[1]).not.toBe(screens[0]?.questions[1]);
  });
});

describe("clearAllTabIds", () => {
  it("puts every question back on every tab", () => {
    const screens = screensWithTabIds(["a"], ["a", "b"], []);
    const result = clearAllTabIds(screens);
    expect(result[0]?.questions.map((question) => question.tabIds)).toEqual([
      [],
      [],
      [],
    ]);
  });

  it("does not mutate the input", () => {
    const screens = screensWithTabIds(["a"], ["b"]);
    const before = JSON.stringify(screens);
    clearAllTabIds(screens);
    expect(JSON.stringify(screens)).toBe(before);
  });

  it("normalizes an absent list to an explicit empty one", () => {
    const screens = screensWithTabIds(undefined);
    expect(clearAllTabIds(screens)[0]?.questions[0]?.tabIds).toEqual([]);
  });
});

// ─── Conversion ─────────────────────────────────────────────────────────────

describe("convertQuestionType", () => {
  it("returns the same question when the type does not change", () => {
    const question = choiceQuestion("A", "Move type", "a");
    expect(convertQuestionType(question, "choice")).toBe(question);
  });

  it("carries the identity fields across every conversion", () => {
    const source: QuestionInput = {
      ...choiceQuestion("A", "Move type", "a"),
      description: "Pick one",
      required: false,
      showIf: { questionId: "EARLIER", optionId: "OPT" },
      tabIds: ["tab-1"],
    };

    for (const type of QUESTION_TYPE_ORDER) {
      const result = convertQuestionType(source, type);
      expect(result.id).toBe("A");
      expect(result.title).toBe("Move type");
      expect(result.description).toBe("Pick one");
      expect(result.required).toBe(false);
      // A question's own show-if points at an EARLIER question; nothing about
      // changing this question's type can invalidate it.
      expect(result.showIf).toEqual({ questionId: "EARLIER", optionId: "OPT" });
      expect(result.tabIds).toEqual(["tab-1"]);
      expect(result.type).toBe(type);
    }
  });

  it("keeps options, variable and hidden default from choice to dropdown", () => {
    const source = choiceQuestion("A", "Move type", "a");
    const result = convertQuestionType(source, "dropdown");
    expect(result.type).toBe("dropdown");
    expect(result).toMatchObject({ variableName: "a", hiddenDefault: 3 });
    // Option IDS survive, which is the whole reason dependent show-ifs can be
    // kept across this particular conversion.
    expect(
      (result as { options: OptionInput[] }).options.map((option) => option.id),
    ).toEqual(["A1", "A2"]);
  });

  it("keeps options (and icons) from choice to multiselect", () => {
    const source = {
      ...choiceQuestion("A", "Move type", "a"),
      options: [
        optionOf("A1", "First", 100),
        { ...optionOf("A2", "Second", 200), icon: "Truck" },
      ],
    };
    const result = convertQuestionType(source, "multiselect");
    expect((result as { options: OptionInput[] }).options).toEqual([
      { id: "A1", label: "First", value: 100, icon: null },
      { id: "A2", label: "Second", value: 200, icon: "Truck" },
    ]);
  });

  it("keeps the variable and seeds two options from number to choice", () => {
    const source: QuestionInput = {
      ...baseOf("N", "Bedrooms"),
      type: "number",
      variableName: "bedrooms",
      hiddenDefault: 2,
      min: 1,
      max: 9,
      unitLabel: "rooms",
    };
    const result = convertQuestionType(source, "choice");
    expect(result).toMatchObject({
      variableName: "bedrooms",
      hiddenDefault: 2,
    });
    const options = (result as { options: OptionInput[] }).options;
    expect(options).toHaveLength(2);
    expect(options.every((option) => option.label === "")).toBe(true);
  });

  it("drops variable and options going from number to text", () => {
    const source: QuestionInput = {
      ...baseOf("N", "Bedrooms"),
      type: "number",
      variableName: "bedrooms",
      hiddenDefault: 2,
      min: null,
      max: null,
      unitLabel: "",
    };
    const result = convertQuestionType(source, "text");
    expect(result).not.toHaveProperty("variableName");
    expect(result).not.toHaveProperty("options");
  });

  it("seeds a number question's variable name from its title", () => {
    const result = convertQuestionType(
      textQuestion("T", "Entrance distance"),
      "number",
    );
    expect(result).toMatchObject({
      variableName: "entrance_distance",
      hiddenDefault: 0,
      min: null,
      max: null,
      unitLabel: "",
    });
  });

  it("prefixes a title that would start with a digit", () => {
    const result = convertQuestionType(
      textQuestion("T", "2nd floor?"),
      "number",
    );
    expect(result).toMatchObject({ variableName: "q_2nd_floor" });
  });

  it("refuses to seed a name that would not survive the schema", () => {
    // Too long (36 characters once slugged, cap is 30).
    expect(
      convertQuestionType(
        textQuestion("T", "How far is the entrance from parking?"),
        "number",
      ),
    ).toMatchObject({ variableName: "" });

    // Shadows a formula function — `max(` always parses as a call, so `max` as
    // a variable could never be referenced.
    expect(
      convertQuestionType(textQuestion("T", "Max"), "number"),
    ).toMatchObject({ variableName: "" });

    // Nothing legal left after slugging.
    expect(
      convertQuestionType(textQuestion("T", "???"), "number"),
    ).toMatchObject({ variableName: "" });
  });

  it("never overwrites a variable name the owner typed", () => {
    const source = choiceQuestion("A", "Entrance distance", "move_type");
    expect(convertQuestionType(source, "number")).toMatchObject({
      variableName: "move_type",
    });
  });

  it("seeds date extras rather than inventing bounds", () => {
    const result = convertQuestionType(textQuestion("T", "Move day"), "date");
    expect(result).toMatchObject({ minDate: "none", maxDaysAhead: null });
  });

  it("does not mutate the question it converts", () => {
    const source = choiceQuestion("A", "Move type", "a");
    const before = JSON.stringify(source);
    convertQuestionType(source, "text");
    expect(JSON.stringify(source)).toBe(before);
  });
});

// ─── Impact ─────────────────────────────────────────────────────────────────

describe("describeTypeChangeImpact", () => {
  it("costs nothing to go from choice to dropdown", () => {
    const impact = describeTypeChangeImpact(
      fixtureDefinition(),
      "A",
      "dropdown",
    );
    expect(impact).toEqual({
      optionsDiscarded: false,
      variableDropped: null,
      dependentShowIfs: [],
      distancesRemoved: [],
      formulaReferencesVariable: false,
    });
  });

  it("loses every dependent show-if going from choice to multiselect", () => {
    const impact = describeTypeChangeImpact(
      fixtureDefinition(),
      "A",
      "multiselect",
    );
    // Multiselect cannot source a condition, so B and C are orphaned even
    // though their option ids survive.
    expect(impact.dependentShowIfs).toEqual([
      { questionId: "B", title: "Anything else?" },
      { questionId: "C", title: "Crew size" },
    ]);
    expect(impact.optionsDiscarded).toBe(false);
    expect(impact.variableDropped).toBeNull();
    expect(impact.formulaReferencesVariable).toBe(false);
  });

  it("reports options, variable, formula and dependents going to text", () => {
    const impact = describeTypeChangeImpact(fixtureDefinition(), "A", "text");
    expect(impact.optionsDiscarded).toBe(true);
    expect(impact.variableDropped).toBe("a");
    expect(impact.formulaReferencesVariable).toBe(true);
    expect(impact.dependentShowIfs.map((entry) => entry.questionId)).toEqual([
      "B",
      "C",
    ]);
    expect(impact.distancesRemoved).toEqual([]);
  });

  it("flags a variable referenced only by a tab's formula override", () => {
    const definition: CalculatorDefinitionInput = {
      ...fixtureDefinition(),
      formula: "d * 2",
      tabs: [{ ...makeTab(), label: "Commercial", formula: "a * 25" }],
    };
    const impact = describeTypeChangeImpact(definition, "A", "text");
    expect(impact.variableDropped).toBe("a");
    expect(impact.formulaReferencesVariable).toBe(true);
  });

  it("does not flag a variable no formula mentions", () => {
    const definition: CalculatorDefinitionInput = {
      ...fixtureDefinition(),
      formula: "d * 2",
    };
    const impact = describeTypeChangeImpact(definition, "A", "text");
    expect(impact.variableDropped).toBe("a");
    expect(impact.formulaReferencesVariable).toBe(false);
  });

  it("removes a distance when an endpoint stops being a location", () => {
    const impact = describeTypeChangeImpact(fixtureDefinition(), "Z1", "text");
    expect(impact.distancesRemoved).toEqual([{ id: "d", variableName: "d" }]);
  });

  it("keeps a distance when the endpoint stays a location", () => {
    const impact = describeTypeChangeImpact(
      fixtureDefinition(),
      "Z1",
      "address",
    );
    expect(impact.distancesRemoved).toEqual([]);
    expect(impact.variableDropped).toBeNull();
  });

  it("reports nothing for a no-op or an unknown question", () => {
    const empty = {
      optionsDiscarded: false,
      variableDropped: null,
      dependentShowIfs: [],
      distancesRemoved: [],
      formulaReferencesVariable: false,
    };
    expect(
      describeTypeChangeImpact(fixtureDefinition(), "A", "choice"),
    ).toEqual(empty);
    expect(
      describeTypeChangeImpact(fixtureDefinition(), "NOPE", "text"),
    ).toEqual(empty);
  });
});

// ─── Applying ───────────────────────────────────────────────────────────────

describe("applyTypeChange", () => {
  it("replaces the question in place and clears exactly the orphaned show-ifs", () => {
    const definition = fixtureDefinition();
    const { screens, distances } = applyTypeChange(definition, "A", "text");

    // Same screen, same position.
    expect(screens[0]?.questions[0]?.id).toBe("A");
    expect(screens[0]?.questions[0]?.type).toBe("text");
    expect(screens.map((screen) => screen.questions.length)).toEqual([2, 3]);

    expect(findQuestion(screens, "B")?.showIf).toBeNull();
    expect(findQuestion(screens, "C")?.showIf).toBeNull();
    // The distance is untouched: neither endpoint was the question that moved.
    expect(distances).toEqual(definition.distances);
  });

  it("leaves unrelated questions and screens by identity", () => {
    const definition = fixtureDefinition();
    const { screens } = applyTypeChange(definition, "A", "text");
    expect(findQuestion(screens, "Z1")).toBe(
      findQuestion(definition.screens, "Z1"),
    );
    // Screen 2 holds C, whose show-if was cleared, so it is rebuilt; screen 1
    // holds the converted question, so it is too. Identity is preserved at the
    // QUESTION level, which is what react-hook-form keys on.
    expect(findQuestion(screens, "Z2")).toBe(
      findQuestion(definition.screens, "Z2"),
    );
  });

  it("removes only the distances that lost an endpoint", () => {
    const definition: CalculatorDefinitionInput = {
      ...fixtureDefinition(),
      distances: [
        {
          id: "d",
          variableName: "d",
          fromQuestionId: "Z1",
          toQuestionId: "Z2",
          hiddenDefault: 0,
          roadFactor: 1.25,
        },
        {
          id: "other",
          variableName: "other",
          fromQuestionId: "Z2",
          toQuestionId: "Z2",
          hiddenDefault: 0,
          roadFactor: 1,
        },
      ],
    };
    const { distances } = applyTypeChange(definition, "Z1", "text");
    expect(distances.map((distance) => distance.id)).toEqual(["other"]);
  });

  it("keeps dependent show-ifs when the conversion preserves them", () => {
    const definition = fixtureDefinition();
    const { screens } = applyTypeChange(definition, "A", "dropdown");
    expect(findQuestion(screens, "B")?.showIf).toEqual({
      questionId: "A",
      optionId: "A1",
    });
    expect(findQuestion(screens, "C")?.showIf).toEqual({
      questionId: "A",
      optionId: "A2",
    });
  });

  it("does not mutate the definition it was given", () => {
    const definition = fixtureDefinition();
    const before = JSON.stringify(definition);
    applyTypeChange(definition, "A", "text");
    applyTypeChange(definition, "Z1", "text");
    expect(JSON.stringify(definition)).toBe(before);
  });
});
