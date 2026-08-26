import { notFound } from "next/navigation";

import { checkBusiness } from "~/lib/check-business";

import { SubscriptionLookupForm } from "./_components/subscription-lookup-form";

export const metadata = {
  title: "Manage Subscription",
  robots: { index: false, follow: false },
};

/**
 * Email-lookup entry point for the subscription manage flow — the
 * `subscriptions` equivalent of `/order-status`. Deliberately NOT gated on
 * the `subscriptions` flag: `subscription.requestManageLinks` is ungated
 * (see the router's authz notes) because a customer must always be able to
 * find their manage link and cancel, even after an owner turns the feature
 * off.
 */
export default async function SubscriptionLookupPage() {
  const business = await checkBusiness();
  if (!business) notFound();

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16 sm:py-24">
      <header className="mb-10 text-center">
        <p className="mb-2 text-[11px] font-medium tracking-[0.14em] text-[#6b6b6b] uppercase">
          {business.name}
        </p>
        <h1 className="mb-3 text-2xl font-medium tracking-tight sm:text-3xl">
          Manage your subscription
        </h1>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-[#6b6b6b]">
          Enter the email address on your subscription and we&apos;ll send you a
          secure link to manage it — no account needed.
        </p>
      </header>

      <SubscriptionLookupForm />
    </main>
  );
}
