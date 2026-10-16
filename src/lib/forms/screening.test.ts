import { describe, expect, it } from "vitest";

import type { FormScreening } from "~/lib/validators/form";
import {
  FORM_DEFAULT_SCREENING_FAIL_MESSAGE,
  makeEmptyFormScreening,
} from "~/lib/validators/form";

import {
  answerScreening,
  backScreening,
  failContent,
  initialScreeningState,
  retryScreening,
  screeningStorageKey,
} from "./screening";

function screening(overrides: Partial<FormScreening> = {}): FormScreening {
  return {
    ...makeEmptyFormScreening(),
    enabled: true,
    questions: [
      {
        id: "q1",
        prompt: "Are you over 18?",
        passAnswer: "yes",
        failMessage: "You must be 18 or older.",
        failLinks: [{ label: "Youth programs", href: "/youth" }],
      },
      {
        id: "q2",
        prompt: "Do you already have an active case?",
        passAnswer: "no",
        failMessage: "",
        failLinks: [],
      },
    ],
    ...overrides,
  };
}

describe("initialScreeningState", () => {
  it("starts at the first question", () => {
    expect(initialScreeningState(screening())).toEqual({
      kind: "question",
      index: 0,
    });
  });

  it("is passed for null, disabled, or empty screening", () => {
    expect(initialScreeningState(null)).toEqual({ kind: "passed" });
    expect(initialScreeningState(screening({ enabled: false }))).toEqual({
      kind: "passed",
    });
    expect(initialScreeningState(screening({ questions: [] }))).toEqual({
      kind: "passed",
    });
  });
});

describe("answerScreening", () => {
  it("advances on a passing answer and passes after the last question", () => {
    const s = screening();
    const afterFirst = answerScreening(
      s,
      { kind: "question", index: 0 },
      "yes",
    );
    expect(afterFirst).toEqual({ kind: "question", index: 1 });
    expect(answerScreening(s, afterFirst, "no")).toEqual({ kind: "passed" });
  });

  it("fails at the same index on a failing answer", () => {
    const s = screening();
    expect(answerScreening(s, { kind: "question", index: 0 }, "no")).toEqual({
      kind: "failed",
      index: 0,
    });
  });

  it("honours passAnswer 'no' (a yes fails)", () => {
    const s = screening();
    expect(answerScreening(s, { kind: "question", index: 1 }, "yes")).toEqual({
      kind: "failed",
      index: 1,
    });
  });

  it("is a no-op for failed and passed states and for null screening", () => {
    const s = screening();
    const failed = { kind: "failed", index: 0 } as const;
    const passed = { kind: "passed" } as const;
    expect(answerScreening(s, failed, "yes")).toBe(failed);
    expect(answerScreening(s, passed, "no")).toBe(passed);
    expect(
      answerScreening(null, { kind: "question", index: 0 }, "yes"),
    ).toEqual({ kind: "question", index: 0 });
  });
});

describe("retryScreening", () => {
  it("returns a failed question to being asked", () => {
    expect(retryScreening({ kind: "failed", index: 1 })).toEqual({
      kind: "question",
      index: 1,
    });
  });

  it("leaves other states alone", () => {
    expect(retryScreening({ kind: "passed" })).toEqual({ kind: "passed" });
    expect(retryScreening({ kind: "question", index: 0 })).toEqual({
      kind: "question",
      index: 0,
    });
  });
});

describe("failContent", () => {
  it("uses the question's own message and links", () => {
    expect(failContent(screening(), 0)).toEqual({
      message: "You must be 18 or older.",
      links: [{ label: "Youth programs", href: "/youth" }],
    });
  });

  it("falls back to the default message when the question has none", () => {
    expect(failContent(screening(), 1)).toEqual({
      message: FORM_DEFAULT_SCREENING_FAIL_MESSAGE,
      links: [],
    });
    expect(
      failContent(screening({ defaultFailMessage: "Not a fit." }), 1).message,
    ).toBe("Not a fit.");
  });
});

describe("screeningStorageKey", () => {
  it("namespaces by form id", () => {
    expect(screeningStorageKey("abc")).toBe("sp-form-screen:abc");
  });
});

describe("backScreening", () => {
  it("steps one question back, never below the first", () => {
    expect(backScreening({ kind: "question", index: 1 })).toEqual({
      kind: "question",
      index: 0,
    });
    expect(backScreening({ kind: "question", index: 0 })).toEqual({
      kind: "question",
      index: 0,
    });
  });

  it("leaves failed and passed states alone", () => {
    expect(backScreening({ kind: "failed", index: 1 })).toEqual({
      kind: "failed",
      index: 1,
    });
    expect(backScreening({ kind: "passed" })).toEqual({ kind: "passed" });
  });
});
