import { describe, expect, it } from "vitest";

import { REWARD_CODE_ALPHABET, REWARD_CODE_LENGTH } from "./constants";
import { generateRewardCode, isRewardCode } from "./codes";

describe("generateRewardCode", () => {
  it("has the RWD- prefix and the expected length", () => {
    const code = generateRewardCode();
    expect(code.startsWith("RWD-")).toBe(true);
    expect(code.length).toBe(4 + REWARD_CODE_LENGTH);
  });

  it("only uses characters from the alphabet", () => {
    const code = generateRewardCode();
    const suffix = code.slice(4);
    for (const char of suffix) {
      expect(REWARD_CODE_ALPHABET.includes(char)).toBe(true);
    }
  });

  it("excludes visually ambiguous characters 0, O, 1, I", () => {
    for (const char of ["0", "O", "1", "I"]) {
      expect(REWARD_CODE_ALPHABET.includes(char)).toBe(false);
    }
    // Run many samples through the real RNG so the assertion isn't vacuous.
    for (let i = 0; i < 200; i++) {
      const suffix = generateRewardCode().slice(4);
      expect(suffix).not.toMatch(/[0O1I]/);
    }
  });

  it("is deterministic with an injected rng", () => {
    const code = generateRewardCode(() => 0);
    expect(code).toBe("RWD-AAAAAA");
  });

  it("uses the injected rng's max argument to pick the alphabet index", () => {
    const code = generateRewardCode(() => REWARD_CODE_ALPHABET.length - 1);
    const lastChar = REWARD_CODE_ALPHABET[REWARD_CODE_ALPHABET.length - 1];
    expect(code).toBe(`RWD-${lastChar!.repeat(REWARD_CODE_LENGTH)}`);
  });
});

describe("isRewardCode", () => {
  it("accepts a well-formed code", () => {
    expect(isRewardCode("RWD-AAAAAA")).toBe(true);
    expect(isRewardCode(generateRewardCode())).toBe(true);
  });

  it("rejects the wrong length", () => {
    expect(isRewardCode("RWD-AAAAA")).toBe(false);
    expect(isRewardCode("RWD-AAAAAAA")).toBe(false);
  });

  it("rejects a missing or wrong prefix", () => {
    expect(isRewardCode("AAAAAA")).toBe(false);
    expect(isRewardCode("XYZ-AAAAAA")).toBe(false);
  });

  it("rejects characters outside the alphabet", () => {
    expect(isRewardCode("RWD-AAAAA0")).toBe(false);
    expect(isRewardCode("RWD-AAAAAO")).toBe(false);
    expect(isRewardCode("RWD-AAAAA1")).toBe(false);
    expect(isRewardCode("RWD-AAAAAI")).toBe(false);
    expect(isRewardCode("RWD-aaaaaa")).toBe(false);
  });
});
