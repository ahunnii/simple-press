import type { Metadata } from "next";
import Link from "next/link";
import { env } from "~/env";
import {
  POLICY_LAST_UPDATED,
  formatPolicyDate,
} from "~/lib/legal/policy-versions";

export const metadata: Metadata = {
  title: "Terms of Service | SimplePress",
  description: "SimplePress platform Terms of Service.",
  alternates: {
    canonical: `https://${env.NEXT_PUBLIC_PLATFORM_DOMAIN}/platform/policies/terms-of-service`,
  },
};

const contactEmail =
  process.env.NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL ??
  "csdt@generativejustice.org";

export default function TermsOfServicePage() {
  return (
    <div className="prose prose-lg mx-auto w-full max-w-7xl px-4 py-8">
      <h1>SimplePress Terms of Service</h1>

      <p>
        <strong>Last Updated:</strong>{" "}
        {formatPolicyDate(POLICY_LAST_UPDATED.termsOfService)}
      </p>

      <h2>1. Agreement to These Terms</h2>
      <p>Welcome to SimplePress.</p>
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and
        use of the SimplePress platform, websites, services, applications, and
        related infrastructure operated by THE CENTER FOR GENERATIVE JUSTICE LLC
        (&ldquo;SimplePress,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
        &ldquo;our&rdquo;).
      </p>
      <p>These Terms apply to:</p>
      <ul>
        <li>simplepress.dev</li>
        <li>all subdomains of simplepress.dev</li>
        <li>custom domains connected to the SimplePress platform</li>
        <li>
          all services, applications, storefronts, APIs, tools, and
          infrastructure provided through SimplePress
        </li>
      </ul>
      <p>
        By accessing or using SimplePress, creating an account, operating a
        storefront, purchasing products through a storefront hosted on
        SimplePress, or otherwise interacting with the platform, you agree to be
        bound by these Terms.
      </p>
      <p>If you do not agree to these Terms, you may not use the platform.</p>
      <hr />

      <h2>2. Eligibility</h2>
      <p>You must be at least 18 years old to use SimplePress.</p>
      <p>By using the platform, you represent and warrant that:</p>
      <ul>
        <li>you are legally capable of entering into a binding agreement;</li>
        <li>all information you provide is accurate and current;</li>
        <li>you will comply with all applicable laws and regulations;</li>
        <li>
          you will not use the platform for unlawful, fraudulent, or prohibited
          activities.
        </li>
      </ul>
      <hr />

      <h2>3. Nature of the Platform</h2>
      <p>
        SimplePress is a software and infrastructure platform that allows
        independent businesses to create and operate online storefronts.
      </p>
      <p>SimplePress and THE CENTER FOR GENERATIVE JUSTICE LLC:</p>
      <ul>
        <li>are not the seller of products listed by businesses;</li>
        <li>are not the merchant of record;</li>
        <li>are not a payment processor;</li>
        <li>are not a shipping or fulfillment provider;</li>
        <li>are not an escrow service;</li>
        <li>
          are not responsible for transactions between businesses and customers.
        </li>
      </ul>
      <p>Businesses using SimplePress are solely responsible for:</p>
      <ul>
        <li>products and services offered;</li>
        <li>pricing;</li>
        <li>taxes;</li>
        <li>shipping;</li>
        <li>fulfillment;</li>
        <li>returns;</li>
        <li>refunds;</li>
        <li>warranties;</li>
        <li>customer support;</li>
        <li>product safety;</li>
        <li>regulatory compliance.</li>
      </ul>
      <p>
        Customers purchase directly from independent businesses using the
        platform.
      </p>
      <p>
        Any dispute regarding products, services, refunds, fulfillment,
        warranties, or transactions must be addressed directly with the business
        involved.
      </p>
      <hr />

      <h2>4. Accounts</h2>
      <p>
        SimplePress uses a centralized account system (&ldquo;SimplePress
        Accounts&rdquo;).
      </p>
      <p>
        A SimplePress Account may be used across multiple storefronts and
        services hosted on the platform.
      </p>
      <p>You are responsible for:</p>
      <ul>
        <li>maintaining the confidentiality of your account credentials;</li>
        <li>all activity occurring under your account;</li>
        <li>
          promptly notifying us of unauthorized access or security concerns.
        </li>
      </ul>
      <p>
        We reserve the right to suspend, restrict, or terminate accounts at our
        discretion.
      </p>
      <p>
        Customers may make purchases without creating an account. However,
        transactional information may still be stored to facilitate orders,
        fraud prevention, customer support, and account linking if an account is
        later created and verified.
      </p>
      <hr />

      <h2>5. Invite-Only Business Access</h2>
      <p>
        At this time, business access to SimplePress is generally invite-only or
        manually approved.
      </p>
      <p>We reserve the right to:</p>
      <ul>
        <li>approve or reject businesses;</li>
        <li>revoke access;</li>
        <li>suspend storefronts;</li>
        <li>remove products or content;</li>
        <li>discontinue services to any business at any time.</li>
      </ul>
      <p>Approval or onboarding of a business does not constitute:</p>
      <ul>
        <li>endorsement;</li>
        <li>certification;</li>
        <li>partnership;</li>
        <li>agency;</li>
        <li>legal representation;</li>
        <li>guarantee of legitimacy or quality.</li>
      </ul>
      <p>
        While SimplePress may provide onboarding assistance, template
        customization, feature development, technical support, operational
        guidance, or collaborative support to businesses, such assistance does
        not create any partnership, franchise, fiduciary, employment, agency, or
        joint venture relationship.
      </p>
      <hr />

      <h2>6. Payments and Stripe</h2>
      <p>
        SimplePress uses third-party payment processors, including Stripe, to
        facilitate transactions.
      </p>
      <p>By using payment functionality on SimplePress, you agree that:</p>
      <ul>
        <li>
          payment processing services are provided by Stripe and governed by
          Stripe&rsquo;s terms and policies;
        </li>
        <li>
          businesses receive funds directly through their own payment accounts
          where applicable;
        </li>
        <li>SimplePress does not hold customer funds;</li>
        <li>SimplePress does not guarantee payment processing availability;</li>
        <li>
          SimplePress is not liable for payment disputes, failed payments,
          chargebacks, fraud, processor outages, frozen accounts, or processor
          enforcement actions.
        </li>
      </ul>
      <p>
        Businesses are solely responsible for complying with all financial, tax,
        and regulatory obligations associated with their sales activity.
      </p>
      <hr />

      <h2>7. Platform Fees</h2>
      <p>SimplePress is currently provided free of charge.</p>
      <p>However, we reserve the right to:</p>
      <ul>
        <li>introduce fees;</li>
        <li>modify pricing;</li>
        <li>implement subscription plans;</li>
        <li>charge for features or services;</li>
        <li>limit free usage;</li>
        <li>modify platform access tiers</li>
      </ul>
      <p>at any time in the future.</p>
      <p>
        Reasonable notice will generally be provided before material pricing
        changes become effective.
      </p>
      <hr />

      <h2>8. Prohibited Activities and Products</h2>
      <p>
        You may not use SimplePress to engage in unlawful, harmful, fraudulent,
        abusive, or prohibited conduct.
      </p>
      <p>
        Prohibited content, products, and activities include, but are not
        limited to:
      </p>
      <ul>
        <li>illegal products or services;</li>
        <li>pornography or sexually explicit material;</li>
        <li>exploitative sexual content;</li>
        <li>child sexual abuse material;</li>
        <li>firearms, ammunition, or illegal weapons;</li>
        <li>illegal drugs or drug paraphernalia;</li>
        <li>counterfeit goods;</li>
        <li>stolen goods;</li>
        <li>pyramid schemes or fraudulent business practices;</li>
        <li>gambling-related products or services;</li>
        <li>hate speech or extremist content;</li>
        <li>malicious software or phishing;</li>
        <li>spam or deceptive marketing;</li>
        <li>unauthorized collection of user data;</li>
        <li>products violating intellectual property rights;</li>
        <li>products making unlawful medical or financial claims;</li>
        <li>deepfake sexual content or non-consensual synthetic media;</li>
        <li>malware, viruses, or harmful code.</li>
      </ul>
      <p>
        We reserve the right to determine, in our sole discretion, whether
        content or activity violates these Terms.
      </p>
      <hr />

      <h2>9. User Content and Store Content</h2>
      <p>
        Businesses and users retain ownership of content they upload to
        SimplePress, including:
      </p>
      <ul>
        <li>product listings;</li>
        <li>text;</li>
        <li>images;</li>
        <li>branding;</li>
        <li>logos;</li>
        <li>descriptions;</li>
        <li>designs;</li>
        <li>storefront content.</li>
      </ul>
      <p>
        By uploading content, you grant SimplePress a limited, non-exclusive,
        worldwide license to:
      </p>
      <ul>
        <li>host;</li>
        <li>store;</li>
        <li>display;</li>
        <li>reproduce;</li>
        <li>transmit;</li>
        <li>cache;</li>
        <li>adapt;</li>
        <li>distribute</li>
      </ul>
      <p>
        such content solely for purposes of operating, improving, securing, and
        maintaining the platform.
      </p>
      <p>You represent and warrant that:</p>
      <ul>
        <li>
          you own or have the rights necessary to use all uploaded content;
        </li>
        <li>your content does not infringe intellectual property rights;</li>
        <li>your content complies with applicable laws;</li>
        <li>
          your content is not deceptive, defamatory, fraudulent, or unlawful.
        </li>
      </ul>
      <hr />

      <h2>10. AI-Generated Content</h2>
      <p>SimplePress permits the use of AI-assisted or AI-generated content.</p>
      <p>
        Users are solely responsible for ensuring that AI-generated content:
      </p>
      <ul>
        <li>
          does not infringe copyrights, trademarks, publicity rights, or other
          rights;
        </li>
        <li>does not violate applicable law;</li>
        <li>does not misrepresent authenticity or ownership;</li>
        <li>does not contain unlawful or harmful material.</li>
      </ul>
      <p>
        SimplePress does not verify the originality, ownership, legality, or
        accuracy of AI-generated content.
      </p>
      <hr />

      <h2>11. Intellectual Property and Platform Ownership</h2>
      <p>The SimplePress platform, including its:</p>
      <ul>
        <li>software;</li>
        <li>codebase;</li>
        <li>infrastructure;</li>
        <li>designs;</li>
        <li>branding;</li>
        <li>trademarks;</li>
        <li>platform architecture;</li>
        <li>proprietary functionality</li>
      </ul>
      <p>are owned by or licensed to THE CENTER FOR GENERATIVE JUSTICE LLC.</p>
      <p>Unless explicitly authorized in writing, you may not:</p>
      <ul>
        <li>copy;</li>
        <li>reproduce;</li>
        <li>redistribute;</li>
        <li>sublicense;</li>
        <li>reverse engineer;</li>
        <li>commercially exploit;</li>
        <li>republish;</li>
        <li>resell;</li>
        <li>create derivative works from</li>
      </ul>
      <p>the SimplePress platform or software.</p>
      <p>
        The platform is source-available in certain contexts but is not
        currently open source and no open-source license is granted unless
        explicitly stated otherwise.
      </p>
      <hr />

      <h2>12. DMCA and Copyright Complaints</h2>
      <p>
        SimplePress respects intellectual property rights and complies with the
        Digital Millennium Copyright Act (&ldquo;DMCA&rdquo;).
      </p>
      <p>
        If you believe content hosted on SimplePress infringes your copyright,
        you may submit a DMCA notice to:
      </p>
      <p>
        DMCA Agent
        <br />
        THE CENTER FOR GENERATIVE JUSTICE LLC
        <br />
        2635 Alex Dr
        <br />
        Ann Arbor, MI 48103
        <br />
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
      </p>
      <p>We reserve the right to:</p>
      <ul>
        <li>remove allegedly infringing content;</li>
        <li>suspend repeat infringers;</li>
        <li>cooperate with rights holders and law enforcement.</li>
      </ul>
      <hr />

      <h2>13. Domains and Subdomains</h2>
      <p>Businesses may use:</p>
      <ul>
        <li>SimplePress subdomains;</li>
        <li>custom domains connected to the platform.</li>
      </ul>
      <p>We reserve the right to:</p>
      <ul>
        <li>reject domains;</li>
        <li>suspend domain connections;</li>
        <li>reclaim inactive subdomains;</li>
        <li>disable domains violating these Terms.</li>
      </ul>
      <p>
        Businesses are responsible for maintaining control of their own domain
        registrations and DNS configurations.
      </p>
      <hr />

      <h2>14. Data, Backups, and Availability</h2>
      <p>
        SimplePress is an evolving platform provided on an experimental and
        best-effort basis.
      </p>
      <p>We do not guarantee:</p>
      <ul>
        <li>uptime;</li>
        <li>uninterrupted access;</li>
        <li>permanent availability;</li>
        <li>bug-free operation;</li>
        <li>error-free functionality;</li>
        <li>preservation of data.</li>
      </ul>
      <p>
        Businesses are solely responsible for maintaining backups or exports of:
      </p>
      <ul>
        <li>product data;</li>
        <li>customer information;</li>
        <li>order history;</li>
        <li>uploaded content;</li>
        <li>business assets.</li>
      </ul>
      <p>
        We may, at our discretion, assist with data exports or migrations, but
        we are under no obligation to do so.
      </p>
      <hr />

      <h2>15. Privacy and Analytics</h2>
      <p>
        SimplePress uses analytics, authentication systems, cookies, session
        management, and third-party infrastructure providers in order to operate
        the platform.
      </p>
      <p>We do not sell user data.</p>
      <p>
        SimplePress currently uses self-hosted Umami analytics and third-party
        providers including Stripe.
      </p>
      <p>Your use of the platform is also governed by our Privacy Policy.</p>
      <hr />

      <h2>16. Communications</h2>
      <p>
        By using SimplePress, you consent to receive electronic communications
        from us, including:
      </p>
      <ul>
        <li>account notices;</li>
        <li>password resets;</li>
        <li>receipts;</li>
        <li>security notifications;</li>
        <li>moderation notices;</li>
        <li>legal notices;</li>
        <li>platform updates;</li>
        <li>operational communications.</li>
      </ul>
      <p>
        These communications may be delivered electronically through email or
        the platform itself.
      </p>
      <hr />

      <h2>17. Platform Changes</h2>
      <p>We reserve the right to:</p>
      <ul>
        <li>modify the platform;</li>
        <li>discontinue features;</li>
        <li>restrict access;</li>
        <li>change functionality;</li>
        <li>impose usage limits;</li>
        <li>introduce or modify fees;</li>
        <li>change eligibility requirements</li>
      </ul>
      <p>at any time and without liability.</p>
      <hr />

      <h2>18. Termination and Enforcement</h2>
      <p>
        We reserve the right to suspend, restrict, or terminate access to the
        platform at our discretion, including for:
      </p>
      <ul>
        <li>violations of these Terms;</li>
        <li>suspected fraud;</li>
        <li>abusive behavior;</li>
        <li>unlawful activity;</li>
        <li>security concerns;</li>
        <li>intellectual property violations;</li>
        <li>conduct harmful to the platform or community.</li>
      </ul>
      <p>
        We may also cooperate with law enforcement or regulatory authorities
        where appropriate.
      </p>
      <hr />

      <h2>19. Disclaimer of Warranties</h2>
      <p>
        SIMPLEPRESS IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
        AVAILABLE.&rdquo;
      </p>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE CENTER FOR GENERATIVE
        JUSTICE LLC DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING:
      </p>
      <ul>
        <li>MERCHANTABILITY;</li>
        <li>FITNESS FOR A PARTICULAR PURPOSE;</li>
        <li>NON-INFRINGEMENT;</li>
        <li>ACCURACY;</li>
        <li>RELIABILITY;</li>
        <li>AVAILABILITY;</li>
        <li>SECURITY.</li>
      </ul>
      <p>WE DO NOT GUARANTEE THAT:</p>
      <ul>
        <li>THE PLATFORM WILL BE ERROR-FREE;</li>
        <li>THE PLATFORM WILL ALWAYS BE AVAILABLE;</li>
        <li>DATA WILL NEVER BE LOST;</li>
        <li>TRANSACTIONS WILL ALWAYS SUCCEED;</li>
        <li>THE PLATFORM WILL MEET YOUR EXPECTATIONS OR BUSINESS NEEDS.</li>
      </ul>
      <p>YOUR USE OF THE PLATFORM IS AT YOUR OWN RISK.</p>
      <hr />

      <h2>20. Limitation of Liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE CENTER FOR GENERATIVE
        JUSTICE LLC, SIMPLEPRESS, AND THEIR OFFICERS, MEMBERS, CONTRACTORS,
        AFFILIATES, AND REPRESENTATIVES SHALL NOT BE LIABLE FOR:
      </p>
      <ul>
        <li>LOST PROFITS;</li>
        <li>LOST REVENUE;</li>
        <li>LOST BUSINESS;</li>
        <li>LOST DATA;</li>
        <li>BUSINESS INTERRUPTION;</li>
        <li>CHARGEBACKS;</li>
        <li>PAYMENT FAILURES;</li>
        <li>SHIPPING FAILURES;</li>
        <li>DOMAIN FAILURES;</li>
        <li>SECURITY INCIDENTS;</li>
        <li>INDIRECT DAMAGES;</li>
        <li>INCIDENTAL DAMAGES;</li>
        <li>CONSEQUENTIAL DAMAGES;</li>
        <li>SPECIAL DAMAGES;</li>
        <li>PUNITIVE DAMAGES.</li>
      </ul>
      <p>
        THIS LIMITATION APPLIES EVEN IF WE WERE ADVISED OF THE POSSIBILITY OF
        SUCH DAMAGES.
      </p>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR TOTAL LIABILITY ARISING OUT
        OF OR RELATED TO THE PLATFORM SHALL NOT EXCEED ONE HUNDRED U.S. DOLLARS
        ($100 USD).
      </p>
      <hr />

      <h2>21. Indemnification</h2>
      <p>
        You agree to defend, indemnify, and hold harmless THE CENTER FOR
        GENERATIVE JUSTICE LLC and SimplePress from any claims, liabilities,
        damages, losses, or expenses arising from:
      </p>
      <ul>
        <li>your use of the platform;</li>
        <li>your storefront or content;</li>
        <li>your products or services;</li>
        <li>your violation of these Terms;</li>
        <li>your violation of applicable laws;</li>
        <li>intellectual property disputes;</li>
        <li>disputes between businesses and customers.</li>
      </ul>
      <hr />

      <h2>22. Arbitration and Class Action Waiver</h2>
      <p>Please read this section carefully.</p>
      <p>
        You agree that any dispute arising out of or relating to these Terms or
        your use of SimplePress shall first be addressed through informal
        good-faith negotiations.
      </p>
      <p>
        If a dispute cannot be resolved informally within thirty (30) days, the
        dispute shall be resolved through binding arbitration in Washtenaw
        County, Michigan.
      </p>
      <p>You waive:</p>
      <ul>
        <li>the right to sue in court;</li>
        <li>the right to a jury trial;</li>
        <li>
          the right to participate in a class action or collective action.
        </li>
      </ul>
      <p>
        Arbitration shall be conducted under the rules of the American
        Arbitration Association (&ldquo;AAA&rdquo;).
      </p>
      <p>
        This arbitration provision shall survive termination of these Terms.
      </p>
      <hr />

      <h2>23. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the State of Michigan, without
        regard to conflict-of-law principles.
      </p>
      <hr />

      <h2>24. Force Majeure</h2>
      <p>
        We shall not be liable for delays, interruptions, failures, or damages
        caused by events beyond our reasonable control, including:
      </p>
      <ul>
        <li>natural disasters;</li>
        <li>internet outages;</li>
        <li>cyberattacks;</li>
        <li>labor disputes;</li>
        <li>infrastructure failures;</li>
        <li>acts of government;</li>
        <li>war;</li>
        <li>terrorism;</li>
        <li>utility failures;</li>
        <li>hosting provider outages.</li>
      </ul>
      <hr />

      <h2>25. Miscellaneous</h2>
      <p>
        These Terms constitute the entire agreement between you and SimplePress
        regarding the platform.
      </p>
      <p>
        If any provision of these Terms is found unenforceable, the remaining
        provisions shall remain in effect.
      </p>
      <p>
        Our failure to enforce any provision shall not constitute a waiver of
        that provision.
      </p>
      <p>
        No agency, partnership, employment, franchise, fiduciary, or joint
        venture relationship is created by these Terms.
      </p>
      <hr />

      <h2>26. Contact Information</h2>
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
        <Link href="/platform/privacy-policy">Privacy Policy</Link> &middot;{" "}
        <Link href="/platform/acceptable-use">Acceptable Use Policy</Link>{" "}
        &middot; <Link href="/platform/disclaimer">Disclaimer</Link> &middot;{" "}
        <Link href="/platform/inform-act">INFORM Act Notice</Link>
      </p>
    </div>
  );
}
