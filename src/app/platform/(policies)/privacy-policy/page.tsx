import Link from "next/link";

const contactEmail =
  process.env.NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL ?? "csdt@generativejustice.org";

export default function PrivacyPolicyPage() {
  return (
    <div className="prose prose-lg mx-auto w-full max-w-7xl px-4 py-8">
      <h1>SimplePress Platform Privacy Policy</h1>
      <p>
        Operated by Center for Generative Justice LLC &mdash; Effective under
        Michigan law.
      </p>

      <h2>1. Data Processing Roles</h2>
      <p>
        SimplePress acts as a <strong>Data Processor</strong>. We host data on
        behalf of Merchants (the Data Controllers). We do not own, sell, or
        monetize your business data or your customers&apos; personal
        information.
      </p>

      <h2>2. Technical Sub-Processors</h2>
      <p>
        To provide the service, we use the following vetted third-party
        providers. Each is bound by its own privacy policy.
      </p>
      <ul>
        <li>
          <strong>Authentication:</strong> Better Auth (email/password
          credentials, session management).
        </li>
        <li>
          <strong>Transactional Email:</strong> Resend (order receipts,
          notifications, and verification emails).
        </li>
        <li>
          <strong>Asset Storage:</strong> Self-hosted MinIO (US-based servers;
          product images and uploaded files).
        </li>
        <li>
          <strong>Analytics:</strong> Self-hosted Umami (privacy-focused, no
          cross-site tracking, no advertising use).
        </li>
        <li>
          <strong>Payment Processing:</strong> Stripe (handles all payment card
          data and merchant identity verification directly &mdash; see Section
          8).
        </li>
        <li>
          <strong>Error Monitoring:</strong> Sentry (captures application errors
          for debugging &mdash; see Section 9).
        </li>
      </ul>

      <h2>3. Data Security</h2>
      <p>
        We implement industry-standard security practices including TLS
        encryption in transit and row-level database security. Merchants are
        responsible for maintaining the security of their own account
        credentials. The Center is responsible for platform-level security
        infrastructure.
      </p>

      <h2>4. The &quot;Global Account&quot; Architecture</h2>
      <p>
        SimplePress is designed to make shopping local easier. To do this, we
        maintain a central database of user accounts.
      </p>
      <ul>
        <li>
          <strong>What we store globally:</strong> Your name, email address,
          profile image, and your list of associated businesses (where you are a
          customer or staff member).
        </li>
        <li>
          <strong>What is shared with Merchants:</strong> When you interact with
          a business (e.g., place an order), that specific Merchant is granted
          access to your profile to fulfill their services.
        </li>
        <li>
          <strong>What is NOT shared:</strong> Merchants never have access to
          your password, your activity at other unrelated shops, or your payment
          methods (which are handled directly by Stripe).
        </li>
      </ul>

      <h2>5. No Data Monetization</h2>
      <p>
        The Center for Generative Justice LLC does not sell your account data,
        track your behavior for advertising, or &quot;pool&quot; your data for
        marketing purposes. Your account exists solely to provide a seamless
        login experience for community-led commerce.
      </p>

      <h2>6. Personal Information We Collect</h2>
      <p>
        We collect the following categories of personal information when you
        create an account or interact with a store on SimplePress:
      </p>
      <ul>
        <li>
          <strong>Identity data:</strong> Name and email address (required for
          account creation).
        </li>
        <li>
          <strong>Profile data:</strong> Optional profile photo.
        </li>
        <li>
          <strong>Transaction data:</strong> Order history, shipping addresses,
          and purchase amounts (stored per Merchant).
        </li>
        <li>
          <strong>Technical data:</strong> IP address and browser/device
          information collected incidentally during normal use and in error
          reports (see Section 9).
        </li>
      </ul>
      <p>
        We do <strong>not</strong> collect payment card numbers, bank account
        details, or government identification &mdash; these are handled
        exclusively by Stripe (see Section 8).
      </p>

      <h2>7. How We Use Your Information</h2>
      <p>We use your information exclusively to:</p>
      <ul>
        <li>Authenticate your account and maintain your session.</li>
        <li>Process and fulfill orders placed at participating stores.</li>
        <li>
          Send transactional emails (order confirmations, shipping updates,
          password resets).
        </li>
        <li>
          Diagnose and fix technical errors (via Sentry error monitoring).
        </li>
        <li>
          Measure aggregate platform usage via self-hosted, privacy-focused
          analytics (Umami).
        </li>
      </ul>
      <p>
        We do <strong>not</strong> use your data for advertising, behavioral
        profiling, or any purpose beyond operating the platform.
      </p>

      <h2>8. Payment Processing &amp; Stripe</h2>
      <p>
        All payment transactions are processed directly by{" "}
        <strong>Stripe</strong>. When you check out on a SimplePress store, your
        payment card details are transmitted directly to Stripe&apos;s servers
        &mdash; they never pass through or are stored by SimplePress. We only
        receive a webhook confirmation from Stripe once a payment is complete.
      </p>
      <p>
        Merchants who connect Stripe accounts undergo identity verification
        (KYC/KYB) managed entirely by Stripe. Stripe&apos;s data practices are
        governed by the{" "}
        <a
          href="https://stripe.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Stripe Privacy Policy
        </a>
        .
      </p>

      <h2>9. Error Monitoring &amp; Sentry</h2>
      <p>
        When a technical error occurs on the platform, diagnostic data is
        automatically sent to{" "}
        <a
          href="https://sentry.io"
          target="_blank"
          rel="noopener noreferrer"
        >
          Sentry
        </a>{" "}
        to help us identify and fix bugs. This data may include:
      </p>
      <ul>
        <li>Your IP address and browser/OS information.</li>
        <li>The page or action you were performing when the error occurred.</li>
        <li>
          Anonymized identifiers for the user and business involved (e.g., a
          numeric ID, not your name or email).
        </li>
      </ul>
      <p>
        Error data is used solely for debugging and improving platform
        stability. It is never used for advertising or shared outside of Sentry.
        Sentry&apos;s data practices are governed by the{" "}
        <a
          href="https://sentry.io/privacy/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Sentry Privacy Policy
        </a>
        .
      </p>

      <h2>10. Cookies &amp; Analytics</h2>
      <p>SimplePress uses two categories of cookies:</p>
      <ul>
        <li>
          <strong>Session cookies (essential):</strong> Set by Better Auth to
          keep you logged in. These are httpOnly cookies and are required for
          the platform to function. They cannot be opted out of while using an
          authenticated session.
        </li>
        <li>
          <strong>Analytics (non-essential):</strong> We use a self-hosted
          instance of{" "}
          <a
            href="https://umami.is"
            target="_blank"
            rel="noopener noreferrer"
          >
            Umami
          </a>
          , a privacy-focused analytics tool. Umami does not use cookies, does
          not track you across sites, and does not fingerprint your device. It
          collects only aggregate page-view data.
        </li>
      </ul>
      <p>
        We do <strong>not</strong> use Google Analytics, Meta Pixel, or any
        third-party advertising or behavioral tracking tools.
      </p>

      <h2>11. Your Rights</h2>
      <p>Under applicable law, you have the right to:</p>
      <ul>
        <li>Request a copy of the personal data we hold about you.</li>
        <li>Request correction of inaccurate information.</li>
        <li>
          Request deletion of your account and associated personal data (subject
          to any legal retention requirements).
        </li>
        <li>Opt out of non-essential communications.</li>
      </ul>
      <p>
        To exercise any of these rights, email{" "}
        <a href={`mailto:${contactEmail}`}>
          {contactEmail}
        </a>
        .
      </p>

      <hr />
      <p className="text-sm text-gray-500">
        Related policies:{" "}
        <Link href="/platform/terms-of-service">Terms of Service</Link>{" "}
        &middot;{" "}
        <Link href="/platform/acceptable-use">Acceptable Use Policy</Link>{" "}
        &middot; <Link href="/platform/disclaimer">Disclaimer</Link> &middot;{" "}
        <Link href="/platform/inform-act">INFORM Act Notice</Link>
      </p>
    </div>
  );
}
