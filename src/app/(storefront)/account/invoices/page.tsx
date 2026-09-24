import { notFound, redirect } from "next/navigation";

import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

import { getTemplate } from "../../_templates/registry";

export const metadata = {
  title: "Invoices",
  robots: { index: false, follow: false },
};

/**
 * `/account/invoices` — same dispatch pattern as `account/subscriptions/page.tsx`.
 *
 * Not gated on the `invoices` flag here: turning the feature off never hides
 * or freezes money records (see the plan's "Turning the feature off" note),
 * so a customer who already has invoices must always be able to see them.
 * The Default nav link itself IS gated behind the flag
 * (`default-account-layout.tsx`'s `BASE_NAV_ITEMS`), so a customer whose
 * business later turns `invoices` off loses the sidebar link but can still
 * reach this page directly (e.g. a bookmarked URL, or the account nav link
 * seen before the flag was flipped).
 */
export default async function InvoicesPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/sign-in?redirectTo=/account/invoices");
  }

  const [business, invoices] = await Promise.all([
    api.business.simplifiedGet(),
    api.invoice.getMine(),
  ]);

  if (!business) notFound();

  const t = getTemplate(business.templateId);

  return <t.InvoicesPage business={business} invoices={invoices} />;
}
