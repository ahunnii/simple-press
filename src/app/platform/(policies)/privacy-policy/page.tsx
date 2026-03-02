export default function PrivacyPolicyPage() {
  return (
    <div className="prose prose-lg mx-auto w-full max-w-7xl px-4 py-8">
      <h1>SimplePress Platform Privacy Policy</h1>
      <p>Focus: Transparency on Infrastructure</p>
      <h2>1. Data Processing Roles</h2>
      <p>
        SimplePress acts as a Data Processor. We host the data on behalf of the
        Merchant (the Data Controller). We do not own, sell, or monetize your
        business data or your customers&apos; personal information.
      </p>
      <h2>2. Technical Sub-Processors</h2>
      <p>To provide the service, we use the following vetted providers:</p>
      <ul>
        <li>Authentication: Better Auth (Email/Password credentials).</li>
        <li>Transactional Email: Resend (For receipts and notifications).</li>
        <li>
          Asset Storage: Self-hosted Minio bucket (Located on US-based servers).
        </li>
        <li>
          Analytics: Self-hosted Umami (Privacy-focused, no cross-site
          tracking).
        </li>
      </ul>
      <h2>3. Data Security</h2>
      <p>
        While we implement industry-standard security (SSL, row-level database
        security), the Merchant is responsible for maintaining the security of
        their own account credentials.
      </p>

      <h2>4. The &quot;Global Account&quot; Architecture</h2>
      <p>
        SimplePress is designed to make shopping local easier. To do this, we
        maintain a central database of User accounts.
      </p>

      <ul>
        <li>
          What we store globally: Your name, email address, profile image, and
          your list of associated businesses (where you are a customer or a
          staff member).
        </li>

        <li>
          What is shared with Merchants: When you interact with a business
          (e.g., place an order or join a mailing list), that specific Merchant
          is granted access to your profile to fulfill their services.
        </li>

        <li>
          What is NOT shared: Merchants never have access to your password, your
          activity at other unrelated shops, or your payment methods (which are
          handled directly by Stripe).
        </li>
      </ul>
      <h2>5. No Data Monetization</h2>
      <p>
        The Center for Generative Justice LLC does not sell your account data,
        track your behavior for advertising, or &quot;pool&quot; your data for
        marketing purposes. Your account exists solely to provide a seamless
        login experience for community-led commerce.
      </p>
    </div>
  );
}
