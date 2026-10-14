/**
 * Who hears about store-level operational alerts (a Stripe dispute, payments
 * disabled): the business's `ownerEmail` plus every OWNER and MANAGER member.
 * STAFF are fulfillment-only and never see money or settings, so they are left
 * out. `ownerEmail` is always first — it is the primary address.
 */

/**
 * Trim, drop null/empty entries and de-duplicate case-insensitively, keeping
 * the first spelling seen and the input order. Pure so it can be unit tested.
 */
export function dedupeAlertRecipients(
  emails: ReadonlyArray<string | null | undefined>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of emails) {
    const email = raw?.trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(email);
  }
  return out;
}

/** The slice of the Prisma client this needs, so tests can stub it. */
type MembershipDb = {
  businessMembership: {
    findMany: (args: {
      where: { businessId: string; role: { in: Array<"OWNER" | "MANAGER"> } };
      select: { user: { select: { email: true } } };
      orderBy: { createdAt: "asc" };
    }) => Promise<Array<{ user: { email: string | null } }>>;
  };
};

/**
 * `ownerEmail` first, then each OWNER/MANAGER member's email, de-duplicated.
 * If the membership read fails, falls back to `ownerEmail` alone — an alert
 * that reaches only the owner beats one that never sends.
 */
export async function getBusinessAlertRecipients(
  db: MembershipDb,
  businessId: string,
  ownerEmail: string | null | undefined,
): Promise<string[]> {
  try {
    const members = await db.businessMembership.findMany({
      where: { businessId, role: { in: ["OWNER", "MANAGER"] } },
      select: { user: { select: { email: true } } },
      orderBy: { createdAt: "asc" },
    });
    return dedupeAlertRecipients([
      ownerEmail,
      ...members.map((m) => m.user.email),
    ]);
  } catch {
    return dedupeAlertRecipients([ownerEmail]);
  }
}
