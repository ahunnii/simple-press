import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { GenericFeatureDisabledPage } from "~/components/shared/generic-feature-disabled-page";

import { TrailHeader } from "../../_components/trail-header";

export const metadata = {
  title: "Tax Guide",
};

export default async function TaxGuidePage() {
  // The Finances layout admits donations-only stores; the Tax Guide is about
  // sales tax on orders, so it needs payments (matches the nav palette gate).
  const flags = await getBusinessFlags();
  if (!flags.isEnabled("payments")) {
    return <GenericFeatureDisabledPage featureName="Payments" />;
  }

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Finances", href: "/admin/finances" },
          { label: "Tax Guide" },
        ]}
      />

      <div className="admin-container space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Tax Guide</h1>
          <p className="text-muted-foreground mt-1">
            Understanding your sales tax obligations and how to set them up in
            Stripe.
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            <strong>This page is for informational purposes only.</strong> It is
            not legal or tax advice. Consult a tax professional for guidance
            specific to your business.
          </p>
        </div>

        {/* Section 1: What is nexus */}
        <Card>
          <CardHeader>
            <CardTitle>What is Sales Tax Nexus?</CardTitle>
            <CardDescription>
              Why online sellers are now responsible for collecting sales tax in
              states beyond where they operate
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <strong>Nexus</strong> means a significant connection to a state
              that creates an obligation to collect and remit sales tax. It can
              be established two ways:
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <strong>Physical nexus</strong> — you have a physical presence
                in the state (office, warehouse, employees).
              </li>
              <li>
                <strong>Economic nexus</strong> — you exceed a certain level of
                sales or transactions into a state, even without a physical
                presence.
              </li>
            </ul>
            <p>
              The 2018 Supreme Court ruling in{" "}
              <em>South Dakota v. Wayfair, Inc.</em> established that states can
              require remote sellers to collect sales tax based on economic
              activity alone. Since then, virtually every state with a sales tax
              has enacted economic nexus laws.
            </p>
          </CardContent>
        </Card>

        {/* Section 2: Economic nexus thresholds */}
        <Card>
          <CardHeader>
            <CardTitle>Economic Nexus Thresholds</CardTitle>
            <CardDescription>
              What triggers a collection obligation in a new state
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Many states use a threshold of <strong>$100,000 in sales</strong>{" "}
              in a calendar year to establish economic nexus. Some of those
              states also count <strong>200 transactions</strong> as a separate
              trigger, though a growing number have dropped that test.
              Thresholds vary and change. A few examples:
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <strong>New York:</strong> $500,000 in sales AND 100+
                transactions (one of the highest thresholds)
              </li>
              <li>
                <strong>California and Texas:</strong> $500,000 in sales (no
                transaction count)
              </li>
              <li>
                <strong>Florida:</strong> $100,000 in sales
              </li>
              <li>
                <strong>Many other states:</strong> $100,000 in sales, with or
                without a 200-transaction test
              </li>
            </ul>
            <p className="text-muted-foreground">
              Because thresholds change, always verify current rules using the
              resources below rather than relying on hardcoded numbers.
            </p>
          </CardContent>
        </Card>

        {/* Section 3: Expanding to new states */}
        <Card>
          <CardHeader>
            <CardTitle>Selling to Customers in New States</CardTitle>
            <CardDescription>
              What to do when your store starts getting orders from a state
              you&apos;re not yet registered in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              When a customer in a new state buys from you, you are{" "}
              <strong>not immediately required to collect sales tax</strong>{" "}
              unless you&apos;ve already crossed that state&apos;s economic
              nexus threshold. Stripe Tax collects tax only in places where
              you&apos;ve added a registration in Stripe.
            </p>
            <p>
              Here&apos;s what to do as your business grows into new states:
            </p>
            <ol className="ml-4 list-decimal space-y-2">
              <li>
                <strong>Monitor your sales by state.</strong> Use the Stripe Tax
                Dashboard or a third-party nexus tracker to see where
                you&apos;re approaching thresholds.
              </li>
              <li>
                <strong>Register for a sales tax permit</strong> in that state
                once you approach the threshold. Each state has its own
                registration portal (usually through their Department of
                Revenue).
              </li>
              <li>
                <strong>
                  Add the registration to your Stripe Tax account.
                </strong>{" "}
                Go to{" "}
                <a
                  href="https://dashboard.stripe.com/tax/registrations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  Stripe Tax → Registrations
                </a>{" "}
                and add the new state. Stripe will automatically begin
                collecting tax from that state&apos;s customers.
              </li>
              <li>
                <strong>No code changes needed.</strong> Once the registration
                is in Stripe, automatic tax collection in that state starts
                immediately.
              </li>
            </ol>
            <p className="rounded-md bg-amber-50 p-3 text-amber-900">
              <strong>Important:</strong> Collecting tax and filing it are
              separate. Stripe Tax can file and remit returns for you through a
              filing partner, but that is an added paid service and only
              available in supported places. Otherwise, you are responsible for
              filing your sales tax returns and sending the collected tax to
              each state, either through the state&apos;s own portal or with a
              filing service.
            </p>
          </CardContent>
        </Card>

        {/* Section 4: How to enable Stripe Tax */}
        <Card>
          <CardHeader>
            <CardTitle>How to Enable Automatic Tax Collection</CardTitle>
            <CardDescription>
              Step-by-step setup for Stripe Tax on your store
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ol className="ml-4 list-decimal space-y-3">
              <li>
                <strong>Finish your Tax settings in Stripe.</strong> Open the{" "}
                <a
                  href="https://dashboard.stripe.com/tax"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  Stripe Tax Dashboard
                </a>{" "}
                and complete the required settings, mainly your head office
                address. Stripe marks Stripe Tax as active once these are filled
                in.
              </li>
              <li>
                <strong>
                  Add a registration for each state you collect in.
                </strong>{" "}
                Go to{" "}
                <a
                  href="https://dashboard.stripe.com/tax/registrations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  Stripe Tax → Registrations
                </a>
                , click <em>Add a registration</em>, and enter your state tax
                permit number for each state where you&apos;re registered.
                Stripe only collects tax where a registration has been added.
              </li>
              <li>
                <strong>Turn on Automatic Tax Collection.</strong> Go to{" "}
                <Link
                  href="/admin/settings/integrations"
                  className="underline underline-offset-2"
                >
                  Settings → Integrations
                </Link>{" "}
                and switch on <em>Automatic Tax Collection</em> under your
                Stripe connection. The switch won&apos;t turn on until your
                Stripe Tax settings are complete.
              </li>
              <li>
                <strong>Test a checkout.</strong> Place a test order from an
                address in one of your registered states. Stripe Tax will
                calculate and add the appropriate tax to the order total at
                checkout.
              </li>
            </ol>
            <p className="text-muted-foreground">
              If you have no registrations yet, Stripe won&apos;t charge any tax
              at checkout. The switch also won&apos;t turn on until your head
              office address is set in your Stripe Tax settings.
            </p>
          </CardContent>
        </Card>

        {/* Section 5: INFORM Act */}
        <Card>
          <CardHeader>
            <CardTitle>The INFORM Consumers Act</CardTitle>
            <CardDescription>
              A federal law about high-volume sellers on online marketplaces
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Under the INFORM Consumers Act, a{" "}
              <strong>high-volume third-party seller</strong> is one with{" "}
              <strong>200 or more discrete sales</strong> and{" "}
              <strong>$5,000 or more in gross revenue</strong> in any continuous
              12-month period within the previous 24 months. The law&apos;s
              obligations fall mainly on online marketplaces, which must collect
              and verify seller information.
            </p>
            <p>
              Keeping your Stripe account verification complete means your
              identity details are on file with Stripe. That isn&apos;t a
              compliance determination, so ask a professional if you&apos;re
              unsure how the law applies to you.
            </p>
            <p>
              See where you stand on the{" "}
              <Link
                href="/admin/finances#inform"
                className="underline underline-offset-2"
              >
                last-12-months tracker on the Finances page
              </Link>
              .
            </p>
          </CardContent>
        </Card>

        {/* Section 6: External resources */}
        <Card>
          <CardHeader>
            <CardTitle>External Resources</CardTitle>
            <CardDescription>
              Authoritative references for sales tax, nexus, and compliance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {[
                {
                  label: "Stripe Tax Documentation",
                  href: "https://stripe.com/docs/tax",
                  description: "Official docs for setting up Stripe Tax",
                },
                {
                  label: "Stripe Tax Registrations Dashboard",
                  href: "https://dashboard.stripe.com/tax/registrations",
                  description: "Manage your state tax registrations in Stripe",
                },
                {
                  label: "TaxJar: Economic Nexus Guide",
                  href: "https://www.taxjar.com/sales-tax/economic-nexus/",
                  description:
                    "State-by-state nexus thresholds, regularly updated",
                },
                {
                  label: "Avalara: State Sales Tax Rates",
                  href: "https://www.avalara.com/taxrates/en/state-rates.html",
                  description: "Current sales tax rates by state",
                },
                {
                  label: "IRS: Online Sellers",
                  href: "https://www.irs.gov/businesses/small-businesses-self-employed/online-sellers",
                  description: "Federal tax guidance for online sellers",
                },
                {
                  label: "FTC: INFORM Consumers Act",
                  href: "https://www.ftc.gov/business-guidance/blog/2023/06/inform-act",
                  description: "FTC guidance on INFORM Act requirements",
                },
              ].map((r) => (
                <li key={r.href}>
                  <a
                    href={r.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium underline underline-offset-2"
                  >
                    {r.label}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                  <p className="text-muted-foreground">{r.description}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
