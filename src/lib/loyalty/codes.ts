/**
 * Loyalty Rewards — reward code generation and shape validation. Pure aside
 * from its default RNG, which uses Node's CSPRNG so generated codes aren't
 * guessable.
 */

import { randomInt } from "node:crypto";

import {
  REWARD_CODE_ALPHABET,
  REWARD_CODE_LENGTH,
  REWARD_CODE_PREFIX,
} from "./constants";

/** Default `randomIndex` for {@link generateRewardCode} — cryptographically strong. */
function defaultRandomIndex(max: number): number {
  return randomInt(max);
}

/**
 * Generates a reward code like `RWD-7F3K9Q`: {@link REWARD_CODE_PREFIX}
 * followed by {@link REWARD_CODE_LENGTH} characters drawn from
 * {@link REWARD_CODE_ALPHABET}. Consumed by the redeem tRPC procedure when it
 * mints a new `DiscountCode` row for a customer's redemption.
 *
 * `randomIndex` is injectable (defaults to a `crypto.randomInt`-backed
 * implementation) purely so tests can pin the output deterministically —
 * production callers should never pass their own.
 */
export function generateRewardCode(
  randomIndex: (max: number) => number = defaultRandomIndex,
): string {
  let suffix = "";
  for (let i = 0; i < REWARD_CODE_LENGTH; i++) {
    const index = randomIndex(REWARD_CODE_ALPHABET.length);
    suffix += REWARD_CODE_ALPHABET[index];
  }
  return `${REWARD_CODE_PREFIX}${suffix}`;
}

const REWARD_CODE_PATTERN = new RegExp(
  `^${REWARD_CODE_PREFIX}[${REWARD_CODE_ALPHABET}]{${REWARD_CODE_LENGTH}}$`,
);

/**
 * Whether `code` is shaped like a value {@link generateRewardCode} could have
 * produced (prefix + exactly {@link REWARD_CODE_LENGTH} alphabet characters).
 * Consumed wherever a reward code needs a cheap shape check before a DB
 * lookup (e.g. distinguishing a reward code from a regular discount code at
 * checkout).
 */
export function isRewardCode(code: string): boolean {
  return REWARD_CODE_PATTERN.test(code);
}
