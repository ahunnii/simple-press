import { describe, expect, it } from "vitest";

import type { QuoteAnswer, QuoteAnswerMap } from "./quote-answers";
import type { PublicQuoteQuestion } from "~/lib/validators/quote-calculator";
import { addCalendarDays, localCalendarDate } from "~/lib/calendar-date";

import {
  answerDisplay,
  isAnswered,
  toPreviewWireAnswers,
  toWireAnswers,
  validateAnswer,
} from "./quote-answers";

function question(
  overrides: Partial<PublicQuoteQuestion> & { id: string },
): PublicQuoteQuestion {
  return {
    type: "text",
    title: "Question",
    description: null,
    required: false,
    showIf: null,
    // Every question in these fixtures is unrestricted — belongs to every
    // tab, including the no-tabs case these tests exercise.
    tabIds: [],
    ...overrides,
  };
}

function address(
  overrides: Partial<Omit<Extract<QuoteAnswer, { kind: "address" }>, "kind">>,
): QuoteAnswer {
  return {
    kind: "address",
    line1: "",
    line2: "",
    city: "",
    state: "",
    zip: "",
    ...overrides,
  };
}

const COMPLETE = {
  line1: "123 Main St",
  line2: "Apt 4",
  city: "Saginaw",
  state: "MI",
  zip: "48601",
};

describe("address answers", () => {
  const optional = question({ id: "addr", type: "address" });
  const required = question({ id: "addr", type: "address", required: true });

  it("counts any non-blank subfield as answered", () => {
    expect(isAnswered(optional, address({}))).toBe(false);
    expect(isAnswered(optional, address({ city: "Saginaw" }))).toBe(true);
  });

  it("lets an untouched optional address through", () => {
    expect(validateAnswer(optional, address({}))).toBeNull();
    expect(validateAnswer(optional, undefined)).toBeNull();
  });

  it("asks a required address to be filled in", () => {
    expect(validateAnswer(required, address({}))).toBe(
      "Please enter your street address, city, state and ZIP.",
    );
  });

  it("distinguishes a half-typed optional address from a required one", () => {
    const partial = address({ line1: "123 Main St", city: "Saginaw" });
    expect(validateAnswer(optional, partial)).toBe(
      "Complete the address or leave it blank.",
    );
    expect(validateAnswer(required, partial)).toBe(
      "Please enter your street address, city, state and ZIP.",
    );
  });

  it("treats a missing apartment number as complete", () => {
    expect(
      validateAnswer(required, address({ ...COMPLETE, line2: "" })),
    ).toBeNull();
  });

  it("rejects a bad ZIP and a non-state", () => {
    expect(validateAnswer(required, address({ ...COMPLETE, zip: "486" }))).toBe(
      "Enter a 5-digit ZIP code.",
    );
    expect(
      validateAnswer(required, address({ ...COMPLETE, state: "ZZ" })),
    ).toBe("Pick a state.");
  });

  it("sends only a complete address, and omits a blank line2", () => {
    const answers: QuoteAnswerMap = { addr: address(COMPLETE) };
    expect(toWireAnswers([required], answers)).toEqual([
      { questionId: "addr", address: COMPLETE },
    ]);

    const noApartment: QuoteAnswerMap = {
      addr: address({ ...COMPLETE, line2: "" }),
    };
    const [wire] = toWireAnswers([required], noApartment);
    expect(wire?.address).toEqual({
      line1: COMPLETE.line1,
      city: COMPLETE.city,
      state: COMPLETE.state,
      zip: COMPLETE.zip,
    });
    expect(wire?.address && "line2" in wire.address).toBe(false);
  });

  it("drops a partial address rather than failing the whole submission", () => {
    const answers: QuoteAnswerMap = {
      addr: address({ line1: "123 Main St", city: "Saginaw" }),
    };
    expect(toWireAnswers([optional], answers)).toEqual([]);
  });

  it("renders the same string the server snapshots", () => {
    expect(answerDisplay(required, address(COMPLETE))).toBe(
      "123 Main St, Apt 4, Saginaw, MI 48601",
    );
    expect(answerDisplay(required, address({ ...COMPLETE, line2: "" }))).toBe(
      "123 Main St, Saginaw, MI 48601",
    );
  });
});

describe("date answers", () => {
  // Derived from the SAME helper `validateAnswer` uses, rather than a fixed
  // literal — a hardcoded "today" would start silently failing the moment the
  // test suite outlived it, and the point of these bounds is that they track
  // whenever the test happens to run.
  const today = localCalendarDate();
  const yesterday = addCalendarDays(today, -1);

  it("rejects a string that is not even shaped like a date", () => {
    const q = question({ id: "when", type: "date" });
    expect(validateAnswer(q, { kind: "value", raw: "09/01/2026" })).toBe(
      "Enter a valid date.",
    );
  });

  it("rejects a calendar date that does not exist", () => {
    const q = question({ id: "when", type: "date" });
    // Shaped correctly (regex passes) but month 13 and Feb 30 do not exist —
    // this is the case a shape-only check would have let through.
    expect(validateAnswer(q, { kind: "value", raw: "2026-13-01" })).toBe(
      "Enter a valid date.",
    );
    expect(validateAnswer(q, { kind: "value", raw: "2026-02-30" })).toBe(
      "Enter a valid date.",
    );
  });

  it("rejects yesterday when minDate is 'today'", () => {
    const q = question({ id: "when", type: "date", minDate: "today" });
    expect(validateAnswer(q, { kind: "value", raw: yesterday })).toBe(
      "Pick today or a later date.",
    );
  });

  it("accepts today when minDate is 'today'", () => {
    const q = question({ id: "when", type: "date", minDate: "today" });
    expect(validateAnswer(q, { kind: "value", raw: today })).toBeNull();
  });

  it("allows a past date when minDate is 'none' (the default)", () => {
    const q = question({ id: "when", type: "date" });
    expect(validateAnswer(q, { kind: "value", raw: yesterday })).toBeNull();
  });

  it("enforces the maxDaysAhead boundary, inclusive", () => {
    const q = question({ id: "when", type: "date", maxDaysAhead: 5 });
    expect(
      validateAnswer(q, { kind: "value", raw: addCalendarDays(today, 5) }),
    ).toBeNull();
    expect(
      validateAnswer(q, { kind: "value", raw: addCalendarDays(today, 6) }),
    ).toBe("Pick a date within 5 days.");
  });

  it("has no ceiling when maxDaysAhead is null", () => {
    const q = question({ id: "when", type: "date", maxDaysAhead: null });
    expect(
      validateAnswer(q, { kind: "value", raw: addCalendarDays(today, 400) }),
    ).toBeNull();
  });
});

describe("answerDisplay", () => {
  it("uses option labels, never ids", () => {
    const choice = question({
      id: "q",
      type: "choice",
      options: [
        { id: "opt_a", label: "Studio", icon: null },
        { id: "opt_b", label: "One bedroom", icon: null },
      ],
    });
    expect(answerDisplay(choice, { kind: "single", optionId: "opt_b" })).toBe(
      "One bedroom",
    );
  });

  it("joins multiselect labels", () => {
    const multi = question({
      id: "q",
      type: "multiselect",
      options: [
        { id: "opt_a", label: "Piano", icon: null },
        { id: "opt_b", label: "Safe", icon: null },
      ],
    });
    expect(
      answerDisplay(multi, { kind: "multi", optionIds: ["opt_a", "opt_b"] }),
    ).toBe("Piano, Safe");
  });

  it("appends the unit label to a number", () => {
    const withUnit = question({ id: "q", type: "number", unitLabel: "rooms" });
    const without = question({ id: "q", type: "number" });
    expect(answerDisplay(withUnit, { kind: "value", raw: "3" })).toBe(
      "3 rooms",
    );
    expect(answerDisplay(without, { kind: "value", raw: "3" })).toBe("3");
  });

  it("returns null for an unanswered question so the row is omitted", () => {
    expect(answerDisplay(question({ id: "q" }), undefined)).toBeNull();
    expect(
      answerDisplay(question({ id: "q" }), { kind: "value", raw: " " }),
    ).toBeNull();
  });
});

describe("toPreviewWireAnswers", () => {
  const questions: PublicQuoteQuestion[] = [
    question({ id: "choice", type: "choice", options: [] }),
    question({ id: "num", type: "number" }),
    question({ id: "zip", type: "zip" }),
    question({ id: "addr", type: "address" }),
    question({ id: "note", type: "text" }),
    question({ id: "essay", type: "longtext" }),
    question({ id: "when", type: "date" }),
  ];

  const answers: QuoteAnswerMap = {
    choice: { kind: "single", optionId: "opt_a" },
    num: { kind: "value", raw: "3" },
    zip: { kind: "value", raw: "48601" },
    addr: address(COMPLETE),
    note: { kind: "value", raw: "call me at 313-555-0143" },
    essay: { kind: "value", raw: "gate code 4471" },
    when: { kind: "value", raw: "2026-09-01" },
  };

  it("never sends free-text or date answers on the anonymous preview", () => {
    const ids = toPreviewWireAnswers(questions, answers).map(
      (entry) => entry.questionId,
    );
    expect(ids).toEqual(["choice", "num", "zip", "addr"]);
  });

  it("sends an address as its ZIP and nothing else", () => {
    // A tRPC query is a GET. The full address projection `toWireAnswers`
    // builds would put "123 Main St, Apt 4" in the URL of an anonymous,
    // uncaptcha'd request, on every debounced keystroke — in the server log,
    // every proxy in between, and the visitor's own history. The ZIP is the
    // only part the price can use, so it is the only part that goes.
    const wire = toPreviewWireAnswers(questions, answers);
    expect(wire).toContainEqual({ questionId: "addr", zip: COMPLETE.zip });
  });

  it("never puts an address object on the preview wire at all", () => {
    // Asserted across the whole payload rather than one entry: this is the
    // property that must hold no matter which types get added to
    // `PREVIEW_QUESTION_TYPES` later.
    for (const entry of toPreviewWireAnswers(questions, answers)) {
      expect("address" in entry).toBe(false);
    }
  });

  it("sends a half-typed address as soon as its ZIP is valid", () => {
    // The street and city are still empty, so this address does not VALIDATE —
    // and it does not need to. A bare ZIP is enough to anchor a distance, so
    // the running estimate starts moving here rather than waiting for fields
    // that will not change the number.
    const wire = toPreviewWireAnswers(questions, {
      addr: address({ zip: "48601" }),
    });
    expect(wire).toEqual([{ questionId: "addr", zip: "48601" }]);
  });

  it("sends nothing for an address whose ZIP subfield is not yet a ZIP", () => {
    const wire = toPreviewWireAnswers(questions, {
      addr: address({ ...COMPLETE, zip: "486" }),
    });
    expect(wire).toEqual([]);
  });

  it("holds back an answer that does not yet validate", () => {
    const ids = toPreviewWireAnswers(questions, {
      ...answers,
      zip: { kind: "value", raw: "486" },
    }).map((entry) => entry.questionId);
    expect(ids).toEqual(["choice", "num", "addr"]);
  });

  it("is empty before anything priced has been answered", () => {
    expect(toPreviewWireAnswers(questions, {})).toEqual([]);
  });
});
