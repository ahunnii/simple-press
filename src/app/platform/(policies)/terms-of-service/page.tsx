export default function TermsOfServicePage() {
  return (
    <div className="prose prose-lg mx-auto w-full max-w-7xl px-4 py-8">
      <h1>SimplePress Platform Terms of Service</h1>
      <p>
        For: SimplePress (The Platform) and Center for Generative Justice LLC
        (The Sponsor)
      </p>

      <h2>1. Scope of Service</h2>
      <p>
        SimplePress is an open-source, multi-tenant e-commerce platform provided
        by the Center for Generative Justice LLC (&quot;the Center&quot;). The
        Center provides the software and hosting infrastructure as a tool for
        independent business owners (&quot;Merchants&quot;). The Center is not a
        party to any transactions between Merchants and their customers.
      </p>

      <h2>The SimplePress Account</h2>
      <p>
        SimplePress offers a &quot;Global Account&quot; feature. By creating a
        SimplePress account, you gain a single identity that can be used across
        all participating businesses on the platform.
      </p>
      <ul>
        <li>
          Account Ownership: Your global profile (name, email, and
          authentication credentials) is managed by the Center for Generative
          Justice LLC.
        </li>
        <li>
          Data Sharing: When you shop at a business using SimplePress, your
          basic profile information is shared with that specific Merchant to
          facilitate your transaction.
        </li>
        <li>
          Security: You are responsible for keeping your SimplePress password
          secure. The Center is responsible for the security of the
          authentication system but is not responsible for how individual
          Merchants handle the data you provide to them.
        </li>
        <li>
          No Cross-Merchant Liability: Using a single account does not create a
          joint venture between the Merchants. A dispute with one business
          (e.g., a lawncare service) does not grant you rights or claims against
          another business or the Platform.
        </li>
      </ul>

      <h2>2. Limitation of Liability (The &quot;Shield&quot; Clause)</h2>
      <p>
        To the maximum extent permitted by Michigan law, the Center, its
        creators, and its affiliates shall not be liable for any damages arising
        from your use of the platform. This includes, but is not limited to:
      </p>

      <ul>
        <li>
          Transaction Disputes: Any issues regarding payments, refunds,
          chargebacks, or non-delivery of goods.
        </li>

        <li>
          Business Losses: Loss of revenue, data, or reputation resulting from
          platform downtime or technical errors.
        </li>

        <li>
          Best-Effort Migration: The WordPress migration tool is a courtesy. We
          do not guarantee a 1:1 data transfer or functional equivalence on
          external platforms.
        </li>
      </ul>
      <h2>3. No Third-Party Beneficiaries</h2>
      <p>
        This agreement is strictly between the Center and the Merchant.
        Customers of the Merchants are not third-party beneficiaries.
        SimplePress will not mediate or arbitrate disputes between a Merchant
        and a Customer.
      </p>

      <h2>4. Prohibited Conduct</h2>
      <p>
        Merchants may not use the platform to sell illegal goods, regulated
        substances (alcohol, tobacco, etc.), or services that violate Michigan
        or Federal law.
      </p>

      <h2>5. Termination & Data Portability</h2>
      <ul>
        <li>
          Standard Exit: Merchants may leave the platform at any time. We
          provide a 30-day window to export data.
        </li>

        <li>
          Emergency Termination: For violations involving illegal goods or
          conduct, the Center reserves the right to suspend access immediately.
          In such cases, we will provide a one-time &quot;Data Dump&quot; (ZIP
          file) of business records via email. This link will expire after 72
          hours, after which all data will be purged.
        </li>
      </ul>
    </div>
  );
}
