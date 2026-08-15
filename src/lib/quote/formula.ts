/**
 * A tiny, safe arithmetic language for owner-written quote pricing formulas.
 *
 * Example: `(500 + bedrooms * 350 + packing + distance * 4) * move_type`
 *
 * **Why hand-rolled rather than a library or `eval`.** The source string is
 * owner input that the SERVER evaluates on every quote submission. `eval`,
 * `new Function`, and every "just sanitize it with a regex first" variant hand
 * a store owner (or anyone who compromises one owner account) arbitrary code
 * execution inside the Node process, across every tenant. So this module
 * tokenizes and walks an AST by hand and never constructs code at runtime.
 * There is no property access, no member call, no assignment, and no way to
 * reach a host object from inside the grammar: the only values are numbers.
 *
 * Pure and isomorphic — no imports, no I/O, no clock, no randomness. The
 * admin builder parses the formula in the browser to show live errors; the
 * server parses and evaluates the same string. Both must agree exactly.
 *
 * Grammar (recursive descent, standard precedence):
 *
 *   expr    := term (("+" | "-") term)*
 *   term    := unary (("*" | "/") unary)*
 *   unary   := "-"? primary
 *   primary := number | ident | ident "(" expr ("," expr)* ")" | "(" expr ")"
 */

// ─── Public types ───────────────────────────────────────────────────────────

export type FormulaFailureCode =
  | "syntax"
  | "unknown-variable"
  | "unknown-function"
  | "bad-arity"
  | "division-by-zero"
  | "not-finite"
  | "too-long";

export type FormulaFailure = {
  code: FormulaFailureCode;
  /** Owner-facing, shown verbatim in the formula field's error state. */
  message: string;
  /** Character offset into the source string, where one applies. */
  position?: number;
};

export type FormulaBinaryOperator = "+" | "-" | "*" | "/";

/**
 * Plain data — no classes, no closures. The AST is safe to hold in memory,
 * structurally compare in tests, and (if a caller ever wants to) serialize.
 */
export type FormulaNode =
  | { kind: "number"; value: number; position: number }
  | { kind: "variable"; name: string; position: number }
  | { kind: "unary"; op: "-"; operand: FormulaNode; position: number }
  | {
      kind: "binary";
      op: FormulaBinaryOperator;
      left: FormulaNode;
      right: FormulaNode;
      position: number;
    }
  | {
      kind: "call";
      name: FormulaFunctionName;
      args: FormulaNode[];
      position: number;
    };

export type ParseResult =
  | {
      ok: true;
      ast: FormulaNode;
      /** Every identifier referenced, deduped, in first-appearance order. */
      variables: string[];
    }
  | { ok: false; error: FormulaFailure };

export type EvalResult =
  | { ok: true; value: number }
  | { ok: false; error: FormulaFailure };

// ─── Language surface ───────────────────────────────────────────────────────

/**
 * Hard cap on formula length. Mirrored by `formula`'s `.max(500)` in
 * `src/lib/validators/quote-calculator.ts` — enforced in both halves because
 * `parseFormula` is also called on definitions already sitting in the database,
 * which never went through the current validator.
 */
export const FORMULA_MAX_LENGTH = 500;

export const FORMULA_FUNCTION_NAMES = [
  "min",
  "max",
  "round",
  "ceil",
  "floor",
] as const;

export type FormulaFunctionName = (typeof FORMULA_FUNCTION_NAMES)[number];

/**
 * Arity is checked at PARSE time, not eval time, so the admin builder can red-
 * flag `round(1, 2)` while the owner is typing rather than at the first real
 * submission — by which point a customer has already seen a broken form.
 */
const FORMULA_FUNCTION_ARITY: Record<
  FormulaFunctionName,
  { min: number; max: number }
> = {
  min: { min: 2, max: Number.POSITIVE_INFINITY },
  max: { min: 2, max: Number.POSITIVE_INFINITY },
  round: { min: 1, max: 1 },
  ceil: { min: 1, max: 1 },
  floor: { min: 1, max: 1 },
};

function asFunctionName(name: string): FormulaFunctionName | null {
  for (const candidate of FORMULA_FUNCTION_NAMES) {
    if (candidate === name) return candidate;
  }
  return null;
}

// ─── Internal failure carrier ───────────────────────────────────────────────

/**
 * Thrown internally so the recursive descent can bail from any depth, and
 * converted back into a `{ ok: false }` result at each public entry point.
 * Never escapes this module.
 */
class FormulaError extends Error {
  readonly failure: FormulaFailure;

  constructor(failure: FormulaFailure) {
    super(failure.message);
    this.name = "FormulaError";
    this.failure = failure;
  }
}

function fail(
  code: FormulaFailureCode,
  message: string,
  position?: number,
): never {
  throw new FormulaError(
    position === undefined ? { code, message } : { code, message, position },
  );
}

// ─── Tokenizer ──────────────────────────────────────────────────────────────

type SymbolValue = "+" | "-" | "*" | "/" | "(" | ")" | ",";

type Token =
  | { type: "number"; value: number; position: number }
  | { type: "ident"; name: string; position: number }
  | { type: "symbol"; value: SymbolValue; position: number }
  | { type: "eof"; position: number };

const SYMBOL_VALUES: readonly SymbolValue[] = [
  "+",
  "-",
  "*",
  "/",
  "(",
  ")",
  ",",
];

function asSymbol(char: string): SymbolValue | null {
  for (const candidate of SYMBOL_VALUES) {
    if (candidate === char) return candidate;
  }
  return null;
}

// `String.prototype.charAt` (not `[]`) throughout: it returns "" past the end
// instead of `undefined`, which keeps every classifier below total under
// `noUncheckedIndexedAccess` without a pile of guards. "" satisfies none of
// them, so end-of-input naturally terminates each scan loop.
function isDigit(char: string): boolean {
  return char >= "0" && char <= "9";
}

/** Identifiers are lowercase-only by design — see QUOTE_VARIABLE_NAME_RE. */
function isIdentStart(char: string): boolean {
  return (char >= "a" && char <= "z") || char === "_";
}

function isIdentPart(char: string): boolean {
  return isIdentStart(char) || isDigit(char);
}

function isWhitespace(char: string): boolean {
  return (
    char === " " ||
    char === "\t" ||
    char === "\n" ||
    char === "\r" ||
    char === "\f" ||
    char === "\v"
  );
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < source.length) {
    const char = source.charAt(index);

    if (isWhitespace(char)) {
      index += 1;
      continue;
    }

    // number := \d+(\.\d+)?  — a trailing "." with no digits after it is left
    // behind and reported as an unexpected character, matching the regex.
    if (isDigit(char)) {
      const start = index;
      while (isDigit(source.charAt(index))) index += 1;
      if (source.charAt(index) === "." && isDigit(source.charAt(index + 1))) {
        index += 1;
        while (isDigit(source.charAt(index))) index += 1;
      }
      tokens.push({
        type: "number",
        value: Number(source.slice(start, index)),
        position: start,
      });
      continue;
    }

    // ident := [a-z_][a-z0-9_]*
    if (isIdentStart(char)) {
      const start = index;
      while (isIdentPart(source.charAt(index))) index += 1;
      tokens.push({
        type: "ident",
        name: source.slice(start, index),
        position: start,
      });
      continue;
    }

    const symbol = asSymbol(char);
    if (symbol) {
      tokens.push({ type: "symbol", value: symbol, position: index });
      index += 1;
      continue;
    }

    fail(
      "syntax",
      `Unexpected character "${char}" at position ${index}`,
      index,
    );
  }

  tokens.push({ type: "eof", position: source.length });
  return tokens;
}

function describeToken(token: Token): string {
  switch (token.type) {
    case "number":
      return String(token.value);
    case "ident":
      return token.name;
    case "symbol":
      return token.value;
    case "eof":
      return "end of formula";
  }
}

// ─── Parser ─────────────────────────────────────────────────────────────────

function parseTokens(tokens: Token[]): FormulaNode {
  let index = 0;

  // `tokenize` always appends an eof token, so the fallback is unreachable —
  // it exists only to keep `peek` total.
  const endOfInput: Token = { type: "eof", position: 0 };

  function peek(): Token {
    return tokens[index] ?? endOfInput;
  }

  function advance(): Token {
    const token = peek();
    index += 1;
    return token;
  }

  function expectSymbol(value: SymbolValue): void {
    const token = peek();
    if (token.type === "symbol" && token.value === value) {
      index += 1;
      return;
    }
    fail(
      "syntax",
      `Expected "${value}" but found ${describeToken(token)} at position ${token.position}`,
      token.position,
    );
  }

  function parseExpr(): FormulaNode {
    let left = parseTerm();
    for (;;) {
      const token = peek();
      if (
        token.type === "symbol" &&
        (token.value === "+" || token.value === "-")
      ) {
        index += 1;
        const right = parseTerm();
        left = {
          kind: "binary",
          op: token.value,
          left,
          right,
          position: token.position,
        };
        continue;
      }
      return left;
    }
  }

  function parseTerm(): FormulaNode {
    let left = parseUnary();
    for (;;) {
      const token = peek();
      if (
        token.type === "symbol" &&
        (token.value === "*" || token.value === "/")
      ) {
        index += 1;
        const right = parseUnary();
        left = {
          kind: "binary",
          op: token.value,
          left,
          right,
          position: token.position,
        };
        continue;
      }
      return left;
    }
  }

  function parseUnary(): FormulaNode {
    const token = peek();
    if (token.type === "symbol" && token.value === "-") {
      index += 1;
      // Single "-" only, per the grammar: "--x" is a syntax error rather than
      // a double negation, because nobody writes that on purpose in a price.
      return {
        kind: "unary",
        op: "-",
        operand: parsePrimary(),
        position: token.position,
      };
    }
    return parsePrimary();
  }

  function parseCallArgs(): FormulaNode[] {
    // At least one argument, then zero or more comma-separated ones. A
    // zero-argument call reports as a syntax error on the ")" rather than
    // bad-arity — no function in this language takes zero arguments.
    const args: FormulaNode[] = [parseExpr()];
    for (;;) {
      const token = peek();
      if (token.type === "symbol" && token.value === ",") {
        index += 1;
        args.push(parseExpr());
        continue;
      }
      return args;
    }
  }

  function parsePrimary(): FormulaNode {
    const token = advance();

    if (token.type === "number") {
      return { kind: "number", value: token.value, position: token.position };
    }

    if (token.type === "ident") {
      const next = peek();
      if (next.type === "symbol" && next.value === "(") {
        index += 1;
        const name = asFunctionName(token.name);
        if (!name) {
          fail(
            "unknown-function",
            `Unknown function "${token.name}" at position ${token.position}. Available functions: ${FORMULA_FUNCTION_NAMES.join(", ")}`,
            token.position,
          );
        }
        const args = parseCallArgs();
        expectSymbol(")");
        checkArity(name, args.length, token.position);
        return { kind: "call", name, args, position: token.position };
      }
      // A bare identifier is always a variable reference. Reserved words are
      // kept out of variable names by the validator, so a bare `round` here
      // simply fails the "every referenced variable is defined" check.
      return { kind: "variable", name: token.name, position: token.position };
    }

    if (token.type === "symbol" && token.value === "(") {
      const inner = parseExpr();
      expectSymbol(")");
      return inner;
    }

    fail(
      "syntax",
      token.type === "eof"
        ? `Unexpected end of formula at position ${token.position}`
        : `Unexpected "${describeToken(token)}" at position ${token.position}`,
      token.position,
    );
  }

  const ast = parseExpr();
  const trailing = peek();
  if (trailing.type !== "eof") {
    fail(
      "syntax",
      `Unexpected "${describeToken(trailing)}" at position ${trailing.position}`,
      trailing.position,
    );
  }
  return ast;
}

function checkArity(
  name: FormulaFunctionName,
  count: number,
  position: number,
): void {
  const arity = FORMULA_FUNCTION_ARITY[name];
  if (count >= arity.min && count <= arity.max) return;

  const expectation =
    arity.min === arity.max
      ? `exactly ${arity.min} argument${arity.min === 1 ? "" : "s"}`
      : `at least ${arity.min} arguments`;

  fail(
    "bad-arity",
    `${name}() needs ${expectation}, got ${count}, at position ${position}`,
    position,
  );
}

// ─── Variable collection ────────────────────────────────────────────────────

function collectVariables(node: FormulaNode, into: string[]): void {
  switch (node.kind) {
    case "number":
      return;
    case "variable":
      if (!into.includes(node.name)) into.push(node.name);
      return;
    case "unary":
      collectVariables(node.operand, into);
      return;
    case "binary":
      collectVariables(node.left, into);
      collectVariables(node.right, into);
      return;
    case "call":
      for (const arg of node.args) collectVariables(arg, into);
      return;
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function parseFormula(source: string): ParseResult {
  if (source.length > FORMULA_MAX_LENGTH) {
    return {
      ok: false,
      error: {
        code: "too-long",
        message: `Formula must be ${FORMULA_MAX_LENGTH} characters or fewer (currently ${source.length})`,
      },
    };
  }

  try {
    const ast = parseTokens(tokenize(source));
    const variables: string[] = [];
    collectVariables(ast, variables);
    return { ok: true, ast, variables };
  } catch (error) {
    if (error instanceof FormulaError)
      return { ok: false, error: error.failure };
    throw error;
  }
}

export function evaluateAst(
  ast: FormulaNode,
  vars: Record<string, number>,
): EvalResult {
  try {
    return { ok: true, value: evaluateNode(ast, vars) };
  } catch (error) {
    if (error instanceof FormulaError)
      return { ok: false, error: error.failure };
    throw error;
  }
}

export function evaluateFormula(
  source: string,
  vars: Record<string, number>,
): EvalResult {
  const parsed = parseFormula(source);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  return evaluateAst(parsed.ast, vars);
}

// ─── Evaluator ──────────────────────────────────────────────────────────────

function finiteOrFail(value: number, position: number): number {
  if (!Number.isFinite(value)) {
    fail(
      "not-finite",
      `Formula produced a value that is not a finite number at position ${position}`,
      position,
    );
  }
  return value;
}

function requireArg(args: number[], index: number, position: number): number {
  const value = args[index];
  if (value === undefined) {
    // Unreachable: arity was validated at parse time. Present so the
    // `noUncheckedIndexedAccess` narrowing is honest rather than asserted away.
    fail(
      "bad-arity",
      `Wrong number of arguments at position ${position}`,
      position,
    );
  }
  return value;
}

function evaluateNode(node: FormulaNode, vars: Record<string, number>): number {
  switch (node.kind) {
    case "number":
      return finiteOrFail(node.value, node.position);

    case "variable": {
      // `hasOwnProperty.call`, never `name in vars` or a truthiness check:
      // identifiers are lowercase, so `constructor` is a legal variable name
      // and a plain lookup would find it on Object.prototype and return a
      // function. Own-property only.
      if (!Object.prototype.hasOwnProperty.call(vars, node.name)) {
        fail(
          "unknown-variable",
          `Unknown variable "${node.name}" at position ${node.position}`,
          node.position,
        );
      }
      const value = vars[node.name];
      if (typeof value !== "number") {
        fail(
          "unknown-variable",
          `Unknown variable "${node.name}" at position ${node.position}`,
          node.position,
        );
      }
      return finiteOrFail(value, node.position);
    }

    case "unary":
      return finiteOrFail(-evaluateNode(node.operand, vars), node.position);

    case "binary": {
      const left = evaluateNode(node.left, vars);
      const right = evaluateNode(node.right, vars);
      switch (node.op) {
        case "+":
          return finiteOrFail(left + right, node.position);
        case "-":
          return finiteOrFail(left - right, node.position);
        case "*":
          return finiteOrFail(left * right, node.position);
        case "/": {
          const value = left / right;
          // Both `x / 0` and any divisor that drives the result to ±Infinity
          // report as division-by-zero — it is the same owner mistake, and
          // "division by zero" is the message that helps them fix it.
          if (right === 0 || !Number.isFinite(value)) {
            fail(
              "division-by-zero",
              `Division by zero at position ${node.position}`,
              node.position,
            );
          }
          return value;
        }
      }
    }

    case "call": {
      const args = node.args.map((arg) => evaluateNode(arg, vars));
      switch (node.name) {
        case "min":
          return finiteOrFail(Math.min(...args), node.position);
        case "max":
          return finiteOrFail(Math.max(...args), node.position);
        case "round":
          return finiteOrFail(
            Math.round(requireArg(args, 0, node.position)),
            node.position,
          );
        case "ceil":
          return finiteOrFail(
            Math.ceil(requireArg(args, 0, node.position)),
            node.position,
          );
        case "floor":
          return finiteOrFail(
            Math.floor(requireArg(args, 0, node.position)),
            node.position,
          );
      }
    }
  }
}
