import { notFound } from "next/navigation";

import { checkBusiness } from "~/lib/check-business";
import { verifyNewsletterConfirmToken } from "~/lib/email/newsletter-confirm-token";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { resolveUnsubscribePageState } from "~/lib/marketing/unsubscribe";
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
 *  - `?view=confirm&t=` : newsletter double opt-in, or the "still want to
 *    hear from us?" invite sent to a contact import (`s: "imp"` tokens, worded
 *    as staying on the list). Confirming is a button press (POST), never page
 *    load, so email link scanners can't subscribe anyone.
 *  - `?s=confirm&t=` : where GET /api/unsubscribe lands people. Unsubscribing
 *    is a button press (POST /api/unsubscribe), never a page load, so link
 *    scanners can't unsubscribe anyone. Once unsubscribed (the state is read
 *    from the database, not from `s`) the card offers a Resubscribe undo —
 *    only to people who had opted in before.
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
          invite={verified.payload.s === "imp"}
        />
      );
    }
  } else if ((status === "confirm" || status === "unsubscribed") && token) {
    // `?s=unsubscribed` is never trusted: the state comes from the database,
    // so a hand-edited or stale link can't claim someone is unsubscribed when
    // they are not. Anyone not already effectively unsubscribed (including a
    // never-subscribed abandoned-checkout reminder recipient) is asked first,
    // and the button's POST records the opt-out.
    const state = await resolveUnsubscribePageState(token, business.id);
    // Resubscribe is offered only to people who had opted in before.
    const canResubscribe =
      state.kind !== "invalid" && state.canResubscribe && marketingEnabled;
    if (state.kind === "invalid") {
      card = (
        <EmailPreferencesCard mode="invalid" businessName={business.name} />
      );
    } else if (state.kind === "unsubscribe") {
      card = (
        <EmailPreferencesCard
          mode="unsubscribe"
          businessName={business.name}
          token={token}
          canResubscribe={canResubscribe}
        />
      );
    } else {
      card = (
        <EmailPreferencesCard
          mode="unsubscribed"
          businessName={business.name}
          token={canResubscribe ? token : undefined}
        />
      );
    }
  } else {
    card = <EmailPreferencesCard mode="invalid" businessName={business.name} />;
  }

  const logoUrl = row?.siteContent?.logoUrl ?? null;

  return (
    // The template layout already provides the page's <main> landmark.
    <div className="mx-auto w-full max-w-xl px-6 py-16 sm:py-24">
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
    </div>
  );
}
