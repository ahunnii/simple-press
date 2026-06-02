import Link from "next/link";

const contactEmail =
  process.env.NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL ??
  "csdt@generativejustice.org";

export default function InformActPage() {
  return (
    <div className="prose prose-lg mx-auto w-full max-w-7xl px-4 py-8">
      <h1>INFORM Consumers Act &mdash; Seller Verification Notice</h1>
      <p>
        This page explains how SimplePress complies with the{" "}
        <strong>
          Integrity, Notification, and Fairness in Online Retail Marketplaces
          for Consumers Act
        </strong>{" "}
        (INFORM Consumers Act), a U.S. federal law effective June 27, 2023.
      </p>

      <h2>1. What the INFORM Consumers Act Requires</h2>
      <p>
        The INFORM Consumers Act requires online marketplaces to collect,
        verify, and disclose certain information about high-volume third-party
        sellers &mdash; defined as sellers who complete 200 or more discrete
        transactions <em>or</em> generate $5,000 or more in annual revenue
        through the platform in a 12-month period.
      </p>
      <p>
        Required verification includes confirming the seller&apos;s identity,
        business address, and contact information. Platforms must also provide
        consumers with a way to report suspicious or non-compliant sellers.
      </p>

      <h2>2. How SimplePress Satisfies This Requirement</h2>
      <p>
        SimplePress uses <strong>Stripe Connect</strong> to handle all payment
        processing for Merchants on the platform. Stripe conducts Know Your
        Customer (KYC) and Know Your Business (KYB) verification on behalf of
        connected accounts as part of its standard onboarding process.
      </p>
      <p>
        The SimplePress payments dashboard automatically monitors each
        Merchant&apos;s annual transaction count and revenue against the INFORM
        Act thresholds. When either threshold is crossed, the Merchant is
        prompted to complete Stripe Connect verification (
        <code>details_submitted: true</code>). Once a Merchant&apos;s Stripe
        account is verified, the platform considers that Merchant
        INFORM-compliant.
      </p>
      <p>Stripe&apos;s verification collects and validates:</p>
      <ul>
        <li>Legal business name and type.</li>
        <li>Business address and contact information.</li>
        <li>
          Government-issued identification or business registration documents
          (for sole proprietors and businesses, respectively).
        </li>
        <li>Bank account details for payouts.</li>
      </ul>

      <h2>3. Platform-Level vs. Merchant-Level Compliance</h2>
      <p>
        The SimplePress platform is designed and operated to be INFORM Act
        compliant. Threshold monitoring and Stripe verification prompts are
        built into every Merchant account dashboard.
      </p>
      <p>
        Individual Merchant compliance depends on each Merchant completing the
        Stripe Connect verification process when prompted. Merchants who do not
        complete verification after being prompted may have their payment
        processing suspended until verification is complete.
      </p>

      <h2>4. Reporting a Suspicious Seller</h2>
      <p>
        If you believe a seller on the SimplePress platform is operating
        fraudulently, misrepresenting their identity, or violating the INFORM
        Consumers Act, please contact the SimplePress team at{" "}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. Include the store
        name or URL and a description of your concern. We will review all
        reports and take appropriate action.
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
