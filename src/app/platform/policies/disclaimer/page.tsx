import type { Metadata } from "next";
import Link from "next/link";

import { env } from "~/env";

export const metadata: Metadata = {
  title: "Disclaimer | SimplePress",
  description:
    "SimplePress platform warranty exclusions, liability limitations, and merchant responsibility.",
  alternates: {
    canonical: `https://${env.NEXT_PUBLIC_PLATFORM_DOMAIN}/platform/policies/disclaimer`,
  },
};

export default function DisclaimerPage() {
  return (
    <div className="prose prose-lg mx-auto w-full max-w-7xl px-4 py-8">
      <h1>SimplePress Platform Disclaimer</h1>
      <p>
        SimplePress is a free, community-oriented platform operated by the
        Center for Generative Justice LLC. Please read this disclaimer carefully
        before using the platform.
      </p>

      <h2>1. No Warranty</h2>
      <p>
        SimplePress is provided <strong>&quot;as is&quot;</strong> and{" "}
        <strong>&quot;as available&quot;</strong> without warranties of any
        kind, either express or implied. The Center for Generative Justice LLC
        makes no representations or warranties regarding:
      </p>
      <ul>
        <li>
          The continuous, uninterrupted availability of the platform or any
          specific feature.
        </li>
        <li>
          The accuracy, completeness, or fitness for purpose of the platform
          software or any data stored within it.
        </li>
        <li>
          The platform&apos;s suitability for any particular commercial purpose
          or business need.
        </li>
      </ul>

      <h2>2. No Liability for Business Impact</h2>
      <p>
        SimplePress is provided at no cost to Merchants. Accordingly, the Center
        accepts no financial liability for any business impact arising from use
        of the platform, including but not limited to:
      </p>
      <ul>
        <li>Lost sales or revenue during planned or unplanned outages.</li>
        <li>Loss of customer data or order history.</li>
        <li>Reputational harm caused by technical failures.</li>
        <li>
          Costs incurred by a Merchant in migrating away from the platform.
        </li>
        <li>
          Financial consequences of relying on the platform for any business
          operation.
        </li>
      </ul>
      <p>
        Merchants use SimplePress at their own risk and are solely responsible
        for maintaining their own business continuity plans.
      </p>

      <h2>3. Merchant Responsibility</h2>
      <p>Each Merchant is solely responsible for:</p>
      <ul>
        <li>
          The accuracy and legality of all content on their storefront,
          including product listings, prices, and descriptions.
        </li>
        <li>
          Complying with all applicable local, state, and federal laws,
          including those governing sales tax collection, consumer protection,
          and data privacy.
        </li>
        <li>
          Fulfilling orders placed by customers and resolving any disputes that
          arise from those transactions.
        </li>
        <li>
          Maintaining secure access to their own SimplePress and connected
          third-party accounts (e.g., Stripe).
        </li>
      </ul>

      <h2>4. Platform Evolution &amp; Discontinuation</h2>
      <p>
        SimplePress is an evolving platform. Features may be added, changed, or
        removed over time. The Center reserves the right to discontinue the
        platform entirely with reasonable notice. In the event of
        discontinuation, the Center will make best efforts to provide Merchants
        with an export of their data within a reasonable timeframe, but cannot
        guarantee the completeness of any such export.
      </p>

      <h2>5. External Links</h2>
      <p>
        SimplePress may contain links to third-party websites or services (such
        as Stripe or Resend). The Center is not responsible for the content,
        privacy practices, or terms of those external sites.
      </p>

      <h2>6. Governing Law</h2>
      <p>
        This disclaimer is governed by the laws of the State of Michigan. By
        using SimplePress, you agree that any disputes arising from this
        disclaimer shall be subject to the exclusive jurisdiction of the courts
        of Michigan.
      </p>

      <hr />
      <p className="text-sm text-gray-500">
        Related policies:{" "}
        <Link href="/platform/policies/terms-of-service">Terms of Service</Link>{" "}
        &middot;{" "}
        <Link href="/platform/policies/privacy-policy">Privacy Policy</Link>{" "}
        &middot;{" "}
        <Link href="/platform/policies/acceptable-use">
          Acceptable Use Policy
        </Link>
      </p>
    </div>
  );
}
