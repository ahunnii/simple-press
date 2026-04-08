import Link from "next/link";

const contactEmail =
  process.env.NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL ?? "csdt@generativejustice.org";

export default function AcceptableUsePage() {
  return (
    <div className="prose prose-lg mx-auto w-full max-w-7xl px-4 py-8">
      <h1>SimplePress Acceptable Use Policy</h1>
      <p>
        This policy defines what Merchants may and may not do on the SimplePress
        platform. By creating and operating a store on SimplePress, you agree to
        these terms. Violations may result in a warning, suspension, or
        permanent termination of your account.
      </p>

      <h2>1. Prohibited Products &amp; Services</h2>
      <p>Merchants may not use SimplePress to sell:</p>
      <ul>
        <li>
          Illegal goods or services under Michigan or Federal law, including
          stolen goods and counterfeit products.
        </li>
        <li>
          Regulated substances including but not limited to: alcohol, tobacco,
          cannabis, controlled pharmaceuticals, and firearms or ammunition
          (unless all applicable federal, state, and local licenses are in place
          and approved by the Center in advance).
        </li>
        <li>
          Adult or sexually explicit content without prior written approval and
          appropriate age-verification mechanisms.
        </li>
        <li>
          Products that infringe on intellectual property rights, including
          unlicensed reproductions of copyrighted designs, trademarks, or
          brand-name goods.
        </li>
        <li>
          Services that constitute practicing law, medicine, or financial
          advising without proper licensure.
        </li>
      </ul>

      <h2>2. Prohibited Conduct</h2>
      <p>Merchants may not:</p>
      <ul>
        <li>
          <strong>Deceive customers</strong> through misleading product
          descriptions, fake reviews, hidden fees, or manipulated pricing.
        </li>
        <li>
          <strong>Send spam</strong> to customers, including unsolicited
          marketing emails beyond what a customer has consented to receive.
        </li>
        <li>
          <strong>Impersonate</strong> another person, business, or the
          SimplePress platform itself in any storefront content, emails, or
          communications.
        </li>
        <li>
          <strong>Harass or harm</strong> customers, platform staff, or other
          Merchants through the platform.
        </li>
        <li>
          <strong>Exploit the platform</strong> to conduct phishing, malware
          distribution, or any other malicious activity.
        </li>
        <li>
          <strong>Collect excessive data</strong> from customers beyond what is
          necessary to fulfill an order.
        </li>
      </ul>

      <h2>3. Content Standards</h2>
      <p>All storefront content (product listings, pages, images) must:</p>
      <ul>
        <li>Be accurate and not materially misleading.</li>
        <li>
          Not contain hate speech, threats, or content that discriminates based
          on race, gender, religion, disability, national origin, or sexual
          orientation.
        </li>
        <li>Not violate any third-party intellectual property rights.</li>
      </ul>

      <h2>4. Enforcement</h2>
      <p>
        SimplePress will respond to reported violations according to the
        following general framework, though we reserve the right to act
        immediately in serious cases:
      </p>
      <ul>
        <li>
          <strong>Warning:</strong> For first-time or minor violations, the
          Merchant will be notified and given a reasonable opportunity to
          correct the issue.
        </li>
        <li>
          <strong>Suspension:</strong> Repeated or moderate violations may
          result in temporary account suspension while the issue is reviewed.
        </li>
        <li>
          <strong>Termination:</strong> Serious violations (illegal goods,
          fraud, harm to customers) will result in immediate account
          termination. A one-time data export will be made available for 72
          hours.
        </li>
      </ul>

      <h2>5. Reporting a Violation</h2>
      <p>
        To report a Merchant you believe is violating this policy, please email{" "}
        <a href={`mailto:${contactEmail}`}>
          {contactEmail}
        </a>{" "}
        with a description of the concern and the store name or URL. The
        SimplePress team will review all reports and respond as appropriate.
      </p>

      <hr />
      <p className="text-sm text-gray-500">
        Related policies:{" "}
        <Link href="/platform/terms-of-service">Terms of Service</Link>{" "}
        &middot; <Link href="/platform/privacy-policy">Privacy Policy</Link>{" "}
        &middot; <Link href="/platform/disclaimer">Disclaimer</Link>
      </p>
    </div>
  );
}
