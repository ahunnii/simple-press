import type { Prisma } from "generated/prisma";

/**
 * The single definition of "who can receive a marketing campaign": opted in,
 * not anonymized, not suppressed (hard bounce / complaint / provider
 * suppression), and with a usable email address.
 *
 * Every audience count, export and snapshot taken at queue time must use this
 * so the number an owner sees is the number we send to. `marketingUnsubscribedAt`
 * is deliberately NOT a predicate: an unsubscribe clears `acceptsMarketing`,
 * so it is already excluded by the opt-in check.
 */
export function marketingAudienceWhere(
  businessId: string,
): Prisma.CustomerWhereInput {
  return {
    businessId,
    acceptsMarketing: true,
    anonymizedAt: null,
    marketingSuppressedAt: null,
    NOT: { email: "" },
  };
}
