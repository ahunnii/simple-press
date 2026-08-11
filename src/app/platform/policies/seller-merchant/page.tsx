import type { Metadata } from "next";
import Link from "next/link";
import { env } from "~/env";
import {
  POLICY_LAST_UPDATED,
  formatPolicyDate,
} from "~/lib/legal/policy-versions";

export const metadata: Metadata = {
  title: "Seller & Merchant Agreement | SimplePress",
  description: "Terms governing businesses operating storefronts on SimplePress.",
  alternates: {
    canonical: `https://${env.NEXT_PUBLIC_PLATFORM_DOMAIN}/platform/policies/seller-merchant`,
  },
};

const contactEmail =
  process.env.NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL ??
  "csdt@generativejustice.org";

export default function SellerMerchantPage() {
  return (
    <div className="prose prose-lg mx-auto w-full max-w-7xl px-4 py-8">
      <h1>SimplePress Seller &amp; Merchant Agreement</h1>

      <p>
        <strong>Last Updated:</strong>{" "}
        {formatPolicyDate(POLICY_LAST_UPDATED.sellerMerchant)}
      </p>

      <h2>1. Introduction</h2>
      <p>
        This Seller &amp; Merchant Agreement (&ldquo;Agreement&rdquo;) governs
        the participation of businesses (&ldquo;Merchant,&rdquo;
        &ldquo;Seller,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) using
        the SimplePress ecommerce platform operated by THE CENTER FOR GENERATIVE
        JUSTICE LLC (&ldquo;SimplePress,&rdquo; &ldquo;we,&rdquo;
        &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
      </p>
      <p>This Agreement supplements the:</p>
      <ul>
        <li>SimplePress Terms of Service;</li>
        <li>Privacy Policy;</li>
        <li>Acceptable Use Policy;</li>
        <li>DMCA Policy;</li>
        <li>
          and any additional policies or guidelines published by SimplePress.
        </li>
      </ul>
      <p>
        By operating a storefront, listing products, or conducting sales through
        SimplePress, you agree to this Agreement.
      </p>
      <hr />

      <h2>2. Nature of the Platform</h2>
      <p>
        SimplePress is a software and infrastructure platform that enables
        independent businesses to operate online storefronts.
      </p>
      <p>SimplePress is not:</p>
      <ul>
        <li>the seller of your products;</li>
        <li>the merchant of record;</li>
        <li>your legal representative;</li>
        <li>your fulfillment provider;</li>
        <li>your employer or partner;</li>
        <li>your agent or franchise operator.</li>
      </ul>
      <p>
        You operate your business independently and remain solely responsible
        for all commercial activity conducted through your storefront.
      </p>
      <p>
        Any technical assistance, onboarding support, customization work,
        feature collaboration, or operational guidance provided by SimplePress
        does not create:
      </p>
      <ul>
        <li>a partnership;</li>
        <li>agency relationship;</li>
        <li>employment relationship;</li>
        <li>fiduciary relationship;</li>
        <li>joint venture;</li>
        <li>franchise arrangement.</li>
      </ul>
      <hr />

      <h2>3. Eligibility and Approval</h2>
      <p>
        Merchant access to SimplePress is currently invite-only or manually
        approved.
      </p>
      <p>SimplePress reserves the right to:</p>
      <ul>
        <li>approve or reject businesses;</li>
        <li>revoke approvals;</li>
        <li>suspend storefronts;</li>
        <li>terminate accounts;</li>
        <li>remove products or content;</li>
        <li>refuse future access.</li>
      </ul>
      <p>Approval onto the platform does not constitute:</p>
      <ul>
        <li>endorsement;</li>
        <li>certification;</li>
        <li>guarantee of legitimacy;</li>
        <li>guarantee of business quality or compliance.</li>
      </ul>
      <hr />

      <h2>4. Merchant Responsibilities</h2>
      <p>As a Merchant using SimplePress, you are solely responsible for:</p>
      <ul>
        <li>your business operations;</li>
        <li>your products and services;</li>
        <li>pricing;</li>
        <li>taxes;</li>
        <li>fulfillment;</li>
        <li>shipping;</li>
        <li>returns;</li>
        <li>warranties;</li>
        <li>customer support;</li>
        <li>legal compliance;</li>
        <li>business licensing;</li>
        <li>regulatory obligations;</li>
        <li>product safety;</li>
        <li>marketing claims;</li>
        <li>consumer protection compliance.</li>
      </ul>
      <p>
        You acknowledge that SimplePress is not responsible for the operation or
        legality of your business.
      </p>
      <hr />

      <h2>5. Product Listings and Content</h2>
      <p>
        You are solely responsible for all content uploaded to your storefront,
        including:
      </p>
      <ul>
        <li>product listings;</li>
        <li>pricing;</li>
        <li>images;</li>
        <li>branding;</li>
        <li>logos;</li>
        <li>descriptions;</li>
        <li>marketing materials;</li>
        <li>policies;</li>
        <li>downloadable files;</li>
        <li>AI-generated content.</li>
      </ul>
      <p>You represent and warrant that:</p>
      <ul>
        <li>you own or have rights to your content;</li>
        <li>your content does not infringe intellectual property rights;</li>
        <li>your listings comply with applicable law;</li>
        <li>your content is accurate and not deceptive.</li>
      </ul>
      <p>
        SimplePress reserves the right to remove or restrict content at our
        discretion.
      </p>
      <hr />

      <h2>6. Prohibited Products and Conduct</h2>
      <p>
        Merchants may not use SimplePress to sell or promote prohibited products
        or engage in prohibited conduct as described in the:
      </p>
      <ul>
        <li>Acceptable Use Policy;</li>
        <li>Terms of Service;</li>
        <li>applicable laws and regulations.</li>
      </ul>
      <p>Prohibited products and conduct include, but are not limited to:</p>
      <ul>
        <li>illegal goods or services;</li>
        <li>counterfeit products;</li>
        <li>pornography or exploitative content;</li>
        <li>unlawful weapons;</li>
        <li>controlled substances;</li>
        <li>scams or deceptive practices;</li>
        <li>malware or harmful software;</li>
        <li>hate speech or extremist content;</li>
        <li>fraudulent medical or financial claims.</li>
      </ul>
      <p>
        SimplePress reserves sole discretion in determining whether conduct or
        products violate platform policies.
      </p>
      <hr />

      <h2>7. Payments and Stripe</h2>
      <p>SimplePress uses third-party payment processors, including Stripe.</p>
      <p>
        By using payment functionality through SimplePress, you acknowledge and
        agree that:
      </p>
      <ul>
        <li>payment processing services are provided by Stripe;</li>
        <li>Stripe&rsquo;s terms and policies independently apply;</li>
        <li>
          you are solely responsible for your Stripe account and compliance
          obligations;
        </li>
        <li>
          you are solely responsible for refunds, disputes, chargebacks, and
          payment obligations;
        </li>
        <li>SimplePress does not hold customer funds;</li>
        <li>
          SimplePress is not responsible for payment processor actions, frozen
          accounts, delayed payouts, or payment failures.
        </li>
      </ul>
      <p>
        You authorize SimplePress to share necessary operational information
        with payment providers where required to facilitate platform
        functionality or compliance.
      </p>
      <hr />

      <h2>8. Taxes</h2>
      <p>Merchants are solely responsible for:</p>
      <ul>
        <li>determining applicable taxes;</li>
        <li>collecting taxes where required;</li>
        <li>remitting taxes;</li>
        <li>maintaining tax records;</li>
        <li>complying with tax laws and regulations.</li>
      </ul>
      <p>
        SimplePress does not provide tax advice and does not guarantee tax
        compliance functionality.
      </p>
      <hr />

      <h2>9. Shipping and Fulfillment</h2>
      <p>Merchants are solely responsible for:</p>
      <ul>
        <li>shipping products;</li>
        <li>fulfillment operations;</li>
        <li>delivery timelines;</li>
        <li>packaging;</li>
        <li>tracking;</li>
        <li>product handling;</li>
        <li>lost shipments;</li>
        <li>returns and exchanges.</li>
      </ul>
      <p>
        SimplePress is not liable for shipping disputes, delays, lost packages,
        or fulfillment failures.
      </p>
      <hr />

      <h2>10. Customer Relationships</h2>
      <p>
        Merchants are solely responsible for interactions with their customers,
        including:
      </p>
      <ul>
        <li>customer support;</li>
        <li>disputes;</li>
        <li>refunds;</li>
        <li>product quality;</li>
        <li>warranties;</li>
        <li>legal compliance;</li>
        <li>communications.</li>
      </ul>
      <p>
        SimplePress may assist with moderation, operational concerns, or abuse
        investigations but is not obligated to resolve merchant-customer
        disputes.
      </p>
      <hr />

      <h2>11. AI-Generated Content</h2>
      <p>SimplePress permits AI-generated or AI-assisted content.</p>
      <p>Merchants are solely responsible for ensuring AI-generated content:</p>
      <ul>
        <li>does not infringe intellectual property rights;</li>
        <li>does not violate privacy or publicity rights;</li>
        <li>does not mislead customers;</li>
        <li>complies with applicable laws and regulations.</li>
      </ul>
      <p>
        SimplePress does not independently verify originality, ownership,
        legality, or authenticity of AI-generated material.
      </p>
      <hr />

      <h2>12. Storefront Domains and Branding</h2>
      <p>Merchants may use:</p>
      <ul>
        <li>SimplePress subdomains;</li>
        <li>approved custom domains.</li>
      </ul>
      <p>You are responsible for:</p>
      <ul>
        <li>maintaining control of your domain registrations;</li>
        <li>DNS configurations;</li>
        <li>domain renewals;</li>
        <li>lawful domain usage.</li>
      </ul>
      <p>SimplePress reserves the right to:</p>
      <ul>
        <li>reclaim inactive subdomains;</li>
        <li>suspend domains;</li>
        <li>reject domain connections;</li>
        <li>remove domains violating platform policies.</li>
      </ul>
      <hr />

      <h2>13. Platform Availability and Experimental Nature</h2>
      <p>
        SimplePress is an evolving and experimental platform provided on a
        best-effort basis.
      </p>
      <p>We do not guarantee:</p>
      <ul>
        <li>uptime;</li>
        <li>uninterrupted service;</li>
        <li>permanent feature availability;</li>
        <li>compatibility;</li>
        <li>bug-free functionality;</li>
        <li>preservation of data.</li>
      </ul>
      <p>
        Features may change, break, or be discontinued as the platform evolves.
      </p>
      <p>
        You acknowledge that use of the platform involves operational and
        technical risk.
      </p>
      <hr />

      <h2>14. Backups and Data Responsibility</h2>
      <p>
        Merchants are solely responsible for maintaining backups or exports of:
      </p>
      <ul>
        <li>products;</li>
        <li>storefront content;</li>
        <li>customer information;</li>
        <li>order history;</li>
        <li>branding assets;</li>
        <li>uploaded media.</li>
      </ul>
      <p>
        SimplePress may assist with exports or migrations at our discretion but
        is under no obligation to provide backup or recovery services.
      </p>
      <hr />

      <h2>15. Communications</h2>
      <p>
        By using SimplePress, you consent to receiving operational
        communications, including:
      </p>
      <ul>
        <li>account notices;</li>
        <li>moderation notices;</li>
        <li>security notices;</li>
        <li>transactional communications;</li>
        <li>platform updates;</li>
        <li>technical support communications;</li>
        <li>legal notices.</li>
      </ul>
      <p>
        Merchants may not use the platform to send spam, deceptive
        communications, or unlawful marketing messages.
      </p>
      <hr />

      <h2>16. Enforcement Rights</h2>
      <p>SimplePress reserves the right, at our sole discretion, to:</p>
      <ul>
        <li>remove content;</li>
        <li>disable storefronts;</li>
        <li>suspend or terminate accounts;</li>
        <li>restrict features;</li>
        <li>investigate suspected violations;</li>
        <li>preserve evidence;</li>
        <li>cooperate with law enforcement;</li>
        <li>take action necessary to protect the platform or users.</li>
      </ul>
      <p>Enforcement actions may occur with or without notice.</p>
      <hr />

      <h2>17. Fees and Future Monetization</h2>
      <p>SimplePress is currently offered free of charge.</p>
      <p>However, SimplePress reserves the right to:</p>
      <ul>
        <li>introduce subscription plans;</li>
        <li>charge platform fees;</li>
        <li>implement premium services;</li>
        <li>modify pricing structures;</li>
        <li>limit free usage</li>
      </ul>
      <p>at any time in the future.</p>
      <p>
        Reasonable notice will generally be provided before material pricing
        changes take effect.
      </p>
      <hr />

      <h2>18. Intellectual Property</h2>
      <p>
        SimplePress and THE CENTER FOR GENERATIVE JUSTICE LLC retain ownership
        of:
      </p>
      <ul>
        <li>platform software;</li>
        <li>infrastructure;</li>
        <li>branding;</li>
        <li>platform architecture;</li>
        <li>proprietary systems;</li>
        <li>designs;</li>
        <li>codebase;</li>
        <li>trademarks.</li>
      </ul>
      <p>
        The SimplePress platform is source-available in certain contexts but is
        not open source unless explicitly stated otherwise.
      </p>
      <p>Merchants may not:</p>
      <ul>
        <li>copy;</li>
        <li>redistribute;</li>
        <li>reverse engineer;</li>
        <li>commercially exploit;</li>
        <li>recreate;</li>
        <li>sublicense</li>
      </ul>
      <p>
        the platform or proprietary infrastructure without written
        authorization.
      </p>
      <hr />

      <h2>19. Disclaimer of Warranties</h2>
      <p>
        SIMPLEPRESS IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
        AVAILABLE.&rdquo;
      </p>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, SIMPLEPRESS DISCLAIMS ALL
        WARRANTIES, EXPRESS OR IMPLIED, INCLUDING:
      </p>
      <ul>
        <li>MERCHANTABILITY;</li>
        <li>FITNESS FOR A PARTICULAR PURPOSE;</li>
        <li>NON-INFRINGEMENT;</li>
        <li>SECURITY;</li>
        <li>RELIABILITY;</li>
        <li>AVAILABILITY.</li>
      </ul>
      <p>WE DO NOT GUARANTEE:</p>
      <ul>
        <li>SALES PERFORMANCE;</li>
        <li>BUSINESS SUCCESS;</li>
        <li>PLATFORM STABILITY;</li>
        <li>ERROR-FREE OPERATION;</li>
        <li>CONTINUOUS AVAILABILITY;</li>
        <li>DATA PRESERVATION.</li>
      </ul>
      <p>YOUR USE OF THE PLATFORM IS AT YOUR OWN RISK.</p>
      <hr />

      <h2>20. Limitation of Liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE CENTER FOR GENERATIVE
        JUSTICE LLC AND SIMPLEPRESS SHALL NOT BE LIABLE FOR:
      </p>
      <ul>
        <li>lost profits;</li>
        <li>lost revenue;</li>
        <li>lost business opportunities;</li>
        <li>lost data;</li>
        <li>payment failures;</li>
        <li>processor actions;</li>
        <li>chargebacks;</li>
        <li>shipping failures;</li>
        <li>customer disputes;</li>
        <li>domain issues;</li>
        <li>service interruptions;</li>
        <li>indirect or consequential damages.</li>
      </ul>
      <p>
        OUR TOTAL LIABILITY ARISING OUT OF OR RELATED TO THE PLATFORM SHALL NOT
        EXCEED ONE HUNDRED U.S. DOLLARS ($100 USD).
      </p>
      <hr />

      <h2>21. Indemnification</h2>
      <p>
        You agree to defend, indemnify, and hold harmless THE CENTER FOR
        GENERATIVE JUSTICE LLC and SimplePress from claims, liabilities,
        damages, losses, or expenses arising from:
      </p>
      <ul>
        <li>your business activities;</li>
        <li>your products or services;</li>
        <li>your storefront content;</li>
        <li>customer disputes;</li>
        <li>legal violations;</li>
        <li>intellectual property disputes;</li>
        <li>your use of the platform.</li>
      </ul>
      <hr />

      <h2>22. Arbitration and Governing Law</h2>
      <p>
        Disputes arising from this Agreement shall first be addressed through
        informal good-faith negotiations.
      </p>
      <p>
        If unresolved within thirty (30) days, disputes shall be resolved
        through binding arbitration in Washtenaw County, Michigan under the
        rules of the American Arbitration Association (&ldquo;AAA&rdquo;).
      </p>
      <p>You waive:</p>
      <ul>
        <li>the right to sue in court;</li>
        <li>the right to a jury trial;</li>
        <li>
          the right to participate in class actions or collective proceedings.
        </li>
      </ul>
      <p>This Agreement is governed by the laws of the State of Michigan.</p>
      <hr />

      <h2>23. Changes to This Agreement</h2>
      <p>
        SimplePress may modify this Agreement at any time as the platform
        evolves.
      </p>
      <p>
        Updated versions become effective upon posting unless otherwise stated.
      </p>
      <p>
        Continued use of the platform constitutes acceptance of revised terms.
      </p>
      <hr />

      <h2>24. Contact Information</h2>
      <p>
        THE CENTER FOR GENERATIVE JUSTICE LLC
        <br />
        2635 Alex Dr
        <br />
        Ann Arbor, MI 48103
        <br />
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
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
        </Link>{" "}
        &middot; <Link href="/platform/policies/dmca">DMCA Policy</Link>
      </p>
    </div>
  );
}
