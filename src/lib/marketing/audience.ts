import type { Prisma } from "generated/prisma";

import type { Audience } from "./segments";

import { audienceSegmentWhere } from "./segments";

/**
 * The single definition of "who can receive a marketing campaign": opted in,
 * not anonymized, not suppressed (hard bounce / complaint / provider
 * suppression), and with a usable email address.
 *
 * Every audience count, export and snapshot taken at queue time must use this
 * so the number an owner sees is the number we send to. `marketingUnsubscribedAt`
 * is deliberately NOT a predicate: an unsubscribe clears `acceptsMarketing`,
 * so it is already excluded by the opt-in check.
 *
 * `audience` optionally narrows this to a campaign segment
 * (`./segments.ts`); it is ANDed on, so a segment can only shrink the list.
 * Omitted (or "all") returns the plain consent filter.
 */
export function marketingAudienceWhere(
  businessId: string,
  audience?: Audience,
  now?: Date,
): Prisma.CustomerWhereInput {
  const base: Prisma.CustomerWhereInput = {
    businessId,
    acceptsMarketing: true,
    anonymizedAt: null,
    marketingSuppressedAt: null,
    NOT: { email: "" },
  };
  if (!audience) return base;
  const segment = audienceSegmentWhere(audience, now);
  return Object.keys(segment).length > 0 ? { ...base, AND: [segment] } : base;
}
