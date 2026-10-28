import { describe, expect, it, vi } from "vitest";

// Pure-helper tests only; the module imports the Prisma client at top level.
vi.mock("~/server/db", () => ({ db: {} }));

import {
  API_TOKEN_PREFIX,
  generateApiToken,
  hashApiToken,
  parseBearer,
} from "./api-tokens";

describe("generateApiToken", () => {
  it("returns a well-formed token, its sha256 hash, and a 12-char prefix", () => {
    const { token, tokenHash, prefix } = generateApiToken();
    expect(token).toMatch(/^spk_[A-Za-z0-9_-]{43}$/);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).toBe(hashApiToken(token));
    expect(prefix).toBe(token.slice(0, 12));
    expect(prefix.startsWith(API_TOKEN_PREFIX)).toBe(true);
  });

  it("is unique per call", () => {
    expect(generateApiToken().token).not.toBe(generateApiToken().token);
  });
});

describe("hashApiToken", () => {
  it("is deterministic and matches a known sha256 vector", () => {
    expect(hashApiToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(hashApiToken("abc")).toBe(hashApiToken("abc"));
  });
});

describe("parseBearer", () => {
  const { token } = generateApiToken();

  it("accepts a valid bearer token, case-insensitive scheme", () => {
    expect(parseBearer(`Bearer ${token}`)).toBe(token);
    expect(parseBearer(`bearer ${token}`)).toBe(token);
    expect(parseBearer(`BEARER ${token}`)).toBe(token);
  });

  it("rejects missing, wrong-scheme, and malformed values", () => {
    expect(parseBearer(null)).toBeNull();
    expect(parseBearer("")).toBeNull();
    expect(parseBearer(token)).toBeNull();
    expect(parseBearer(`Basic ${token}`)).toBeNull();
    expect(parseBearer("Bearer ")).toBeNull();
    expect(parseBearer("Bearer sk_" + "a".repeat(43))).toBeNull();
    expect(parseBearer("Bearer spk_short")).toBeNull();
    expect(parseBearer(`Bearer ${token}x`)).toBeNull();
    expect(parseBearer(`Bearer ${token.slice(0, -1)}!`)).toBeNull();
    expect(parseBearer(`Bearer ${token} extra`)).toBeNull();
  });
});
