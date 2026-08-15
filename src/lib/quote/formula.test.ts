import { describe, expect, it } from "vitest";

import type { FormulaFailure } from "./formula";

import { evaluateFormula, FORMULA_MAX_LENGTH, parseFormula } from "./formula";

/**
 * The pricing formula language. Every case here is a promise made to store
 * owners: a formula that parses in the admin builder must evaluate the same
 * way on the server at submission time, because those are the same two
 * functions.
 */

function value(source: string, vars: Record<string, number> = {}): number {
  const result = evaluateFormula(source, vars);
  if (!result.ok) {
    throw new Error(
      `expected "${source}" to evaluate, got ${result.error.code}: ${result.error.message}`,
    );
  }
  return result.value;
}

function failureOf(
  source: string,
  vars: Record<string, number> = {},
): FormulaFailure {
  const result = evaluateFormula(source, vars);
  if (result.ok) {
    throw new Error(`expected "${source}" to fail, got ${result.value}`);
  }
  return result.error;
}

describe("parseFormula / evaluateFormula — arithmetic", () => {
  it("gives * and / precedence over + and -", () => {
    expect(value("2+3*4")).toBe(14);
    expect(value("2*3+4")).toBe(10);
    expect(value("10-6/2")).toBe(7);
  });

  it("is left-associative for same-precedence operators", () => {
    expect(value("10-2-3")).toBe(5);
    expect(value("100/10/2")).toBe(5);
  });

  it("honors parentheses", () => {
    expect(value("(2+3)*4")).toBe(20);
    expect(value("2*(3+(4-1))")).toBe(12);
  });

  it("supports unary minus", () => {
    expect(value("-5+3")).toBe(-2);
    expect(value("-(2+3)")).toBe(-5);
    expect(value("3 * -2")).toBe(-6);
    expect(value("0 - -4")).toBe(4);
  });

  it("reads decimal literals", () => {
    expect(value("1.5*2")).toBe(3);
    expect(value("0.25+0.75")).toBe(1);
  });

  it("substitutes variables", () => {
    expect(
      value("(500 + bedrooms * 350 + packing + distance * 4) * move_type", {
        bedrooms: 3,
        packing: 350,
        distance: 69.1,
        move_type: 1.5,
      }),
    ).toBeCloseTo(3264.6, 6);
  });

  it("ignores whitespace, including tabs and newlines", () => {
    expect(value("  2\t+\n3 * 4  ")).toBe(14);
    expect(value("min( 1 , 2 )")).toBe(1);
  });
});

describe("parseFormula / evaluateFormula — functions", () => {
  it("evaluates all five built-ins", () => {
    expect(value("min(3, 1, 2)")).toBe(1);
    expect(value("max(3, 1, 2)")).toBe(3);
    expect(value("round(1.4)")).toBe(1);
    expect(value("ceil(1.1)")).toBe(2);
    expect(value("floor(1.9)")).toBe(1);
  });

  it("pins round() to JavaScript's half-up-toward-+Infinity rounding", () => {
    // Math.round(2.5) === 3 and Math.round(-2.5) === -2. Owners write pricing
    // against this, so it is a documented behavior, not an accident.
    expect(value("round(2.5)")).toBe(3);
    expect(value("round(-2.5)")).toBe(-2);
    expect(value("round(3.5)")).toBe(4);
  });

  it("evaluates nested calls", () => {
    expect(value("max(round(2.4), min(3, 4))")).toBe(3);
    expect(value("min(max(1, 2), ceil(1.2) + 5)")).toBe(2);
    expect(value("round(min(a, b) / 2)", { a: 9, b: 20 })).toBe(5);
  });

  it("rejects min/max with fewer than 2 arguments at parse time", () => {
    const parsed = parseFormula("min(5)");
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe("bad-arity");
    expect(parsed.error.message).toContain("at least 2 arguments");

    expect(failureOf("max(5)").code).toBe("bad-arity");
  });

  it("rejects round/ceil/floor with anything but 1 argument at parse time", () => {
    for (const source of ["round(1, 2)", "ceil(1, 2)", "floor(1, 2, 3)"]) {
      const parsed = parseFormula(source);
      expect(parsed.ok).toBe(false);
      if (parsed.ok) continue;
      expect(parsed.error.code).toBe("bad-arity");
      expect(parsed.error.message).toContain("exactly 1 argument");
    }
  });

  it("rejects an unknown function name at parse time", () => {
    const parsed = parseFormula("sqrt(4)");
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe("unknown-function");
    expect(parsed.error.message).toContain('"sqrt"');
    expect(parsed.error.position).toBe(0);
  });
});

describe("parseFormula — variable collection", () => {
  it("returns every referenced identifier, deduped, in first-appearance order", () => {
    const parsed = parseFormula("a + b + a * c - min(c, d)");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.variables).toEqual(["a", "b", "c", "d"]);
  });

  it("returns an empty list for a constant formula", () => {
    const parsed = parseFormula("(500 + 100) * 2");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.variables).toEqual([]);
  });
});

describe("evaluateFormula — runtime failures", () => {
  it("reports an unknown variable with its position", () => {
    //          0123456
    // "500 + bedroms * 2" — the identifier starts at index 6.
    const error = failureOf("500 + bedroms * 2", { bedrooms: 3 });
    expect(error.code).toBe("unknown-variable");
    expect(error.message).toBe('Unknown variable "bedroms" at position 6');
    expect(error.position).toBe(6);
  });

  it("does not resolve inherited Object.prototype keys as variables", () => {
    // `constructor` is a legal lowercase identifier. A naive `name in vars`
    // lookup would find Object.prototype.constructor and hand a function to
    // the arithmetic.
    const error = failureOf("constructor + 1", {});
    expect(error.code).toBe("unknown-variable");
  });

  it("reports division by zero", () => {
    expect(failureOf("10 / 0").code).toBe("division-by-zero");
    expect(failureOf("10 / (5 - 5)").code).toBe("division-by-zero");
    expect(failureOf("1 / x", { x: 0 }).code).toBe("division-by-zero");
  });

  it("reports a literal that overflows to Infinity as not-finite", () => {
    expect(failureOf("9".repeat(400)).code).toBe("not-finite");
  });

  it("reports an overflowing product as not-finite", () => {
    const error = failureOf("big * big", { big: 1e308 });
    expect(error.code).toBe("not-finite");
  });
});

describe("parseFormula — syntax and length", () => {
  it("reports an unexpected character with its position", () => {
    const parsed = parseFormula("2 + %");
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe("syntax");
    expect(parsed.error.position).toBe(4);
  });

  it("rejects uppercase identifiers (lowercase-only by design)", () => {
    const parsed = parseFormula("Bedrooms + 1");
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe("syntax");
    expect(parsed.error.position).toBe(0);
  });

  it("reports a truncated expression", () => {
    expect(parseFormula("2 +").ok).toBe(false);
    expect(parseFormula("").ok).toBe(false);
    expect(parseFormula("(2 + 3").ok).toBe(false);
    expect(parseFormula("2 3").ok).toBe(false);
  });

  it("accepts a formula exactly at the length cap", () => {
    const source = "1+".repeat(249) + "11";
    expect(source.length).toBe(FORMULA_MAX_LENGTH);
    expect(parseFormula(source).ok).toBe(true);
  });

  it("rejects a formula one character over the cap", () => {
    const source = "1+".repeat(250) + "1";
    expect(source.length).toBe(FORMULA_MAX_LENGTH + 1);
    const parsed = parseFormula(source);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.code).toBe("too-long");
  });
});
