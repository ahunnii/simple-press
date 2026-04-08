import Link from "next/link";

const contactEmail =
  process.env.NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL ?? "csdt@generativejustice.org";

export default function TermsOfServicePage() {
  return (
    <div className="prose prose-lg mx-auto w-full max-w-7xl px-4 py-8">
      <h1>SimplePress Platform Terms of Service</h1>
      <p>
        For: SimplePress (The Platform) and Center for Generative Justice LLC
        (The Sponsor) &mdash; Effective under Michigan law.
      </p>

      <h2>1. Scope of Service</h2>
      <p>
        SimplePress is an open-source, multi-tenant e-commerce platform provided
        free of charge by the Center for Generative Justice LLC (&quot;the
        Center&quot;). The Center provides the software and hosting
        infrastructure as a community tool for independent business owners
        (&quot;Merchants&quot;). The Center is not a party to any transactions
        between Merchants and their customers.
      </p>

      <h2>2. The SimplePress Account</h2>
      <p>
        SimplePress offers a &quot;Global Account&quot; feature. By creating a
        SimplePress account, you gain a single identity that can be used across
        all participating businesses on the platform.
      </p>
      <ul>
        <li>
          <strong>Account Ownership:</strong> Your global profile (name, email,
          and authentication credentials) is managed by the Center for
          Generative Justice LLC.
        </li>
        <li>
          <strong>Data Sharing:</strong> When you shop at a business using
          SimplePress, your basic profile information is shared with that
          specific Merchant to facilitate your transaction.
        </li>
        <li>
          <strong>Security:</strong> You are responsible for keeping your
          SimplePress password secure. The Center is responsible for the
          security of the authentication system but is not responsible for how
          individual Merchants handle the data you provide to them.
        </li>
        <li>
          <strong>No Cross-Merchant Liability:</strong> Using a single account
          does not create a joint venture between Merchants. A dispute with one
          business does not grant you rights or claims against another business
          or the Platform.
        </li>
      </ul>

      <h2>3. No Financial Liability</h2>
      <p>
        SimplePress is provided <strong>free of charge</strong>, as-is, with no
        guarantee of uptime, availability, or feature continuity. To the maximum
        extent permitted by Michigan law, the Center, its creators, and its
        affiliates shall not be liable for any financial losses, lost revenue,
        lost data, or business damages arising from your use of the platform.
        This includes, but is not limited to:
      </p>
      <ul>
        <li>
          <strong>Platform Downtime:</strong> Loss of sales or customer
          relationships due to planned or unplanned outages.
        </li>
        <li>
          <strong>Data Issues:</strong> Data loss, corruption, or incomplete
          migrations.
        </li>
        <li>
          <strong>Best-Effort Migration:</strong> The WordPress/WooCommerce
          migration tools are a courtesy. We do not guarantee a 1:1 data
          transfer or functional equivalence.
        </li>
        <li>
          <strong>Platform Decisions:</strong> Any cost incurred by a Merchant
          as a result of using, relying upon, or being removed from this
          platform.
        </li>
      </ul>

      <h2>4. Merchant&ndash;Customer Disputes</h2>
      <p>
        SimplePress is strictly the platform host and is not a party to any
        transaction between a Merchant and their customer. Customers must direct
        all disputes &mdash; including refunds, non-delivery, product quality,
        and chargebacks &mdash; directly to the individual Merchant. SimplePress
        will not mediate, arbitrate, or adjudicate these disputes.
      </p>
      <p>
        Customers of Merchants are not third-party beneficiaries of this
        agreement and have no claims against the Center arising from their
        shopping experience.
      </p>
      <p>
        To report a Merchant for a policy violation or suspected fraud, email{" "}
        <a href={`mailto:${contactEmail}`}>
          {contactEmail}
        </a>
        . SimplePress reserves the right to investigate and suspend or terminate
        accounts following that review.
      </p>

      <h2>5. Acceptable Use &amp; Prohibited Conduct</h2>
      <p>
        Merchants may not use the platform for prohibited conduct. See our full{" "}
        <Link href="/platform/acceptable-use">Acceptable Use Policy</Link> for
        the complete list. In summary, Merchants may not:
      </p>
      <ul>
        <li>
          Sell illegal goods, regulated substances (alcohol, tobacco, controlled
          pharmaceuticals, weapons), or services that violate Michigan or
          Federal law.
        </li>
        <li>
          Post counterfeit, stolen, or fraudulently represented products.
        </li>
        <li>
          Send spam, post fake reviews, or engage in deceptive pricing
          practices.
        </li>
        <li>
          Impersonate another person, business, or the SimplePress platform
          itself.
        </li>
      </ul>

      <h2>6. Payment Processing &amp; Stripe</h2>
      <p>
        Merchants who enable payment features do so via Stripe Connect. By using
        payments on SimplePress, Merchants are also bound by{" "}
        <a
          href="https://stripe.com/connect-account/legal"
          target="_blank"
          rel="noopener noreferrer"
        >
          Stripe&apos;s Connected Account Agreement
        </a>
        . SimplePress is not liable for Stripe&apos;s decisions, including
        account holds, payout delays, chargeback rulings, or account
        terminations. Disputes regarding payments or payouts must be resolved
        directly with Stripe.
      </p>

      <h2>7. Third-Party Feature Development</h2>
      <p>
        SimplePress may connect Merchants with third-party developers for
        feature requests that fall outside the platform&apos;s scope. Any
        resulting agreement, quote, payment, or liability is strictly between
        the Merchant and that developer. SimplePress takes no fees, is not a
        party to such engagements, and bears no responsibility for the quality
        or outcome of third-party work.
      </p>

      <h2>8. Platform Service Evolution</h2>
      <p>
        As SimplePress grows, services currently provided at no cost (for
        example, transactional email delivery via Resend) may transition to
        requiring Merchants to connect and fund their own third-party accounts.
        The Center will provide reasonable advance notice before any such change
        takes effect. Continued use of the platform after that notice constitutes
        acceptance of the change.
      </p>

      <h2>9. Offboarding for Scale</h2>
      <p>
        SimplePress is designed for small, community-based businesses. If a
        Merchant&apos;s resource usage, storage, or web traffic materially
        impacts the performance of other businesses on the platform, the Center
        reserves the right to initiate offboarding. The affected Merchant will
        receive at least 30 days&apos; notice. During that window, the Center
        will provide best-effort assistance in migrating data but cannot
        guarantee a complete or lossless transfer to any third-party platform.
      </p>

      <h2>10. Termination &amp; Data Portability</h2>
      <ul>
        <li>
          <strong>Standard Exit:</strong> Merchants may leave the platform at
          any time. We provide a 30-day window to export data.
        </li>
        <li>
          <strong>Emergency Termination:</strong> For violations involving
          illegal goods or conduct, the Center reserves the right to suspend
          access immediately. In such cases, we will provide a one-time
          &quot;Data Dump&quot; (ZIP file) of business records via email. This
          link will expire after 72 hours, after which all data will be purged.
        </li>
      </ul>

      <h2>11. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the State of Michigan. Any
        disputes arising under these Terms shall be subject to the exclusive
        jurisdiction of the courts of Michigan.
      </p>

      <hr />
      <p className="text-sm text-gray-500">
        Related policies:{" "}
        <Link href="/platform/privacy-policy">Privacy Policy</Link> &middot;{" "}
        <Link href="/platform/acceptable-use">Acceptable Use Policy</Link>{" "}
        &middot; <Link href="/platform/disclaimer">Disclaimer</Link> &middot;{" "}
        <Link href="/platform/inform-act">INFORM Act Notice</Link>
      </p>
    </div>
  );
}
