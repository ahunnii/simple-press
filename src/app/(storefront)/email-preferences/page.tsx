import { notFound } from "next/navigation";

import { checkBusiness } from "~/lib/check-business";
import { verifyNewsletterConfirmToken } from "~/lib/email/newsletter-confirm-token";
import { verifyUnsubscribeToken } from "~/lib/email/unsubscribe-token";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { db } from "~/server/db";

import { EmailPreferencesCard } from "./_components/email-preferences-card";

export const metadata = {
  title: "Email preferences",
  robots: { index: false, follow: false },
};

// Tokens ride in the query string; never serve a cached copy.
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Landing page for two email links, template-agnostic on purpose (it renders
 * inside whichever storefront layout the store uses):
 *  - `?view=confirm&t=` : newsletter double opt-in. Confirming is a button
 *    press (POST), never page load, so email link scanners can't subscribe
 *    anyone.
 *  - `?s=unsubscribed&t=` : where /api/unsubscribe lands people, with a
 *    Resubscribe undo.
 */
export default async function EmailPreferencesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const business = await checkBusiness();
  if (!business) notFound();

  const params = await searchParams;
  const token = first(params.t);
  const view = first(params.view);
  const status = first(params.s);

  const row = await db.business.findUnique({
    where: { id: business.id },
    select: {
      featureFlags: true,
      siteContent: { select: { logoUrl: true } },
    },
  });
  const { isEnabled, disabledByDependency } = resolveFlags(row?.featureFlags);
  const marketingEnabled =
    isEnabled("emailMarketing") &&
    !disabledByDependency.includes("emailMarketing");

  let card: React.ReactNode;

  if (view === "confirm" && token) {
    const verified = verifyNewsletterConfirmToken(token);
    if (!verified.ok) {
      card = (
        <EmailPreferencesCard
          mode={verified.reason === "expired" ? "expired" : "invalid"}
          businessName={business.name}
        />
      );
    } else if (verified.payload.b !== business.id) {
      card = (
        <EmailPreferencesCard mode="invalid" businessName={business.name} />
      );
    } else if (!marketingEnabled) {
      card = (
        <EmailPreferencesCard mode="unavailable" businessName={business.name} />
      );
    } else {
      card = (
        <EmailPreferencesCard
          mode="confirm"
          businessName={business.name}
          token={token}
          email={verified.payload.e}
        />
      );
    }
  } else if (status === "unsubscribed" && token) {
    const payload = verifyUnsubscribeToken(token);
    // A token for another store (or garbage) gets the generic state: no
    // resubscribe button, nothing implying it did anything.
    if (payload?.businessId !== business.id) {
      card = (
        <EmailPreferencesCard mode="invalid" businessName={business.name} />
      );
    } else {
      card = (
        <EmailPreferencesCard
          mode="unsubscribed"
          businessName={business.name}
          token={marketingEnabled ? token : undefined}
        />
      );
    }
  } else {
    card = <EmailPreferencesCard mode="invalid" businessName={business.name} />;
  }

  const logoUrl = row?.siteContent?.logoUrl ?? null;

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16 sm:py-24">
      <header className="mb-8 text-center">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={business.name}
            className="mx-auto mb-3 max-h-14 w-auto object-contain"
          />
        ) : (
          <p className="mb-2 text-[11px] font-medium tracking-[0.14em] uppercase opacity-60">
            {business.name}
          </p>
        )}
      </header>
      {card}
    </main>
  );
}
