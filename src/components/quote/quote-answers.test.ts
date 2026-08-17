import { describe, expect, it } from "vitest";

import type { QuoteAnswer, QuoteAnswerMap } from "./quote-answers";
import type { PublicQuoteQuestion } from "~/lib/validators/quote-calculator";

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
