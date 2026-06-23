import Link from "next/link";
import { ExternalLink } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";

export const metadata = {
  title: "Tax Setup Guide",
};

export default function TaxGuidePage() {
  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Tax Guide" },
        ]}
      />
      <HubSubNav hub="settings" />

      <div className="admin-container space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Tax Setup Guide</h1>
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
              Most states use a threshold of{" "}
              <strong>$100,000 in sales or 200 transactions</strong> in a
              calendar year to establish economic nexus — but thresholds vary
              and change. A few examples:
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <strong>New York:</strong> $500,000 in sales AND 100+
                transactions (one of the highest thresholds)
              </li>
              <li>
                <strong>California, Texas, Florida:</strong> $500,000 in sales
                (no transaction count)
              </li>
              <li>
                <strong>Most other states:</strong> $100,000 in sales OR 200
                transactions
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
              nexus threshold. Stripe Tax will automatically handle this — it
              only collects tax in states where you have active registrations.
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
              <strong>Important:</strong> Stripe Tax collects tax but does not
              file returns or remit taxes to the states on your behalf. You are
              responsible for filing periodic sales tax returns and sending the
              collected tax to each state. Consider using a service like TaxJar
              AutoFile or Avalara Returns to automate this.
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
                <strong>Enable the toggle in your store.</strong> Go to{" "}
                <Link
                  href="/admin/settings/integrations"
                  className="underline underline-offset-2"
                >
                  Settings → Integrations
                </Link>{" "}
                and turn on <em>Automatic Tax Collection</em> under your Stripe
                connection.
              </li>
              <li>
                <strong>Add tax registrations in Stripe.</strong> Open the{" "}
                <a
                  href="https://dashboard.stripe.com/tax/registrations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  Stripe Tax Dashboard
                </a>{" "}
                and click <em>Add a registration</em>. Select each state where
                you have nexus and enter your state tax permit number.
              </li>
              <li>
                <strong>Verify your registrations are active.</strong> Stripe
                will only collect tax in states with an &quot;Active&quot;
                status. Pending or incomplete registrations will not trigger tax
                collection.
              </li>
              <li>
                <strong>Test a checkout.</strong> Place a test order from an
                address in one of your registered states. Stripe Tax will
                calculate and add the appropriate tax to the order total at
                checkout.
              </li>
            </ol>
            <p className="text-muted-foreground">
              If you enable automatic tax but have no active registrations in
              Stripe, checkout sessions will fail. Always add at least one
              registration before enabling the toggle.
            </p>
          </CardContent>
        </Card>

        {/* Section 5: INFORM Act */}
        <Card>
          <CardHeader>
            <CardTitle>The INFORM Consumers Act</CardTitle>
            <CardDescription>
              Seller identity verification requirements for marketplace sellers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              The INFORM Consumers Act (effective June 2023) requires online
              marketplaces to collect and verify certain information from
              &quot;high-volume third-party sellers&quot; — defined as sellers
              who complete <strong>200+ transactions</strong> or generate{" "}
              <strong>$5,000+ in gross annual revenue</strong> on the platform.
            </p>
            <p>
              When you approach these thresholds, your{" "}
              <Link
                href="/admin/payments"
                className="underline underline-offset-2"
              >
                Payments page
              </Link>{" "}
              will alert you. The required verification is handled through your
              Stripe account — completing Stripe&apos;s identity and business
              verification (KYB/KYC) satisfies the INFORM Act&apos;s
              requirements for identity confirmation.
            </p>
            <p className="text-muted-foreground">
              Stripe Connect requires all connected accounts to submit business
              details. If you completed the Stripe onboarding process, you are
              likely already compliant.
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
