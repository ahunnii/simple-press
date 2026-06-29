import type { Metadata } from "next";
import Link from "next/link";
import { env } from "~/env";

export const metadata: Metadata = {
  title: "Privacy Policy | SimplePress",
  description: "How SimplePress collects, uses, and protects your personal information.",
  alternates: {
    canonical: `https://${env.NEXT_PUBLIC_PLATFORM_DOMAIN}/platform/policies/privacy-policy`,
  },
};

const contactEmail =
  process.env.NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL ??
  "csdt@generativejustice.org";

export default function PrivacyPolicyPage() {
  return (
    <div className="prose prose-lg mx-auto w-full max-w-7xl px-4 py-8">
      <h1>SimplePress Platform Privacy Policy</h1>

      <p>
        <strong>Last Updated:</strong> May 29, 2026
      </p>

      <h2>1. Introduction</h2>
      <p>
        This Privacy Policy explains how THE CENTER FOR GENERATIVE JUSTICE LLC
        (&ldquo;SimplePress,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
        &ldquo;our&rdquo;) collects, uses, stores, and discloses information
        when you access or use:
      </p>
      <ul>
        <li>simplepress.dev;</li>
        <li>storefronts hosted on the SimplePress platform;</li>
        <li>custom domains connected to the platform;</li>
        <li>
          related services, applications, APIs, communications, and
          infrastructure.
        </li>
      </ul>
      <p>
        By using SimplePress, you agree to the collection and use of information
        in accordance with this Privacy Policy.
      </p>
      <hr />

      <h2>2. Scope of This Policy</h2>
      <p>This Privacy Policy applies to:</p>
      <ul>
        <li>visitors browsing SimplePress;</li>
        <li>businesses operating storefronts on SimplePress;</li>
        <li>customers purchasing from storefronts hosted on SimplePress;</li>
        <li>users creating SimplePress Accounts.</li>
      </ul>
      <p>
        This Privacy Policy does not govern the independent business practices
        of storefront operators using the platform. Businesses hosted on
        SimplePress may have their own policies, terms, and practices.
      </p>
      <hr />

      <h2>3. Information We Collect</h2>

      <h3>A. Account Information</h3>
      <p>When you create or use a SimplePress Account, we may collect:</p>
      <ul>
        <li>name;</li>
        <li>email address;</li>
        <li>username;</li>
        <li>encrypted authentication credentials;</li>
        <li>account preferences;</li>
        <li>verification status;</li>
        <li>profile information.</li>
      </ul>

      <h3>B. Transaction and Order Information</h3>
      <p>
        When purchases are made through storefronts hosted on SimplePress, we
        may collect:
      </p>
      <ul>
        <li>order details;</li>
        <li>purchased products;</li>
        <li>shipping information;</li>
        <li>billing information;</li>
        <li>customer email address;</li>
        <li>transaction metadata;</li>
        <li>order history;</li>
        <li>refund or dispute information.</li>
      </ul>
      <p>
        Payment card information is generally processed by third-party payment
        processors such as Stripe and is not stored directly by SimplePress.
      </p>

      <h3>C. Business and Storefront Information</h3>
      <p>Businesses using SimplePress may provide:</p>
      <ul>
        <li>business names;</li>
        <li>branding;</li>
        <li>logos;</li>
        <li>product listings;</li>
        <li>descriptions;</li>
        <li>storefront content;</li>
        <li>custom domain information;</li>
        <li>support communications;</li>
        <li>uploaded media and files.</li>
      </ul>

      <h3>D. Technical and Device Information</h3>
      <p>
        We may automatically collect certain technical information, including:
      </p>
      <ul>
        <li>IP addresses;</li>
        <li>browser type;</li>
        <li>operating system;</li>
        <li>device information;</li>
        <li>referring pages;</li>
        <li>session activity;</li>
        <li>timestamps;</li>
        <li>diagnostic and security logs;</li>
        <li>user agent information.</li>
      </ul>

      <h3>E. Analytics Information</h3>
      <p>
        SimplePress uses self-hosted analytics tools, including Umami Analytics,
        to better understand platform usage, performance, and reliability.
      </p>
      <p>Analytics may collect:</p>
      <ul>
        <li>page visits;</li>
        <li>approximate geographic region;</li>
        <li>browser and device information;</li>
        <li>referrer data;</li>
        <li>session behavior;</li>
        <li>
          on-site interactions, such as products viewed or added to cart and
          engagement with embedded content;
        </li>
        <li>technical performance metrics.</li>
      </ul>
      <p>
        We do not use analytics to sell personal data or build advertising
        profiles.
      </p>

      <h3>F. Communications</h3>
      <p>
        If you contact us or interact with platform communications, we may
        collect:
      </p>
      <ul>
        <li>email correspondence;</li>
        <li>support requests;</li>
        <li>moderation communications;</li>
        <li>operational notices;</li>
        <li>feedback and bug reports.</li>
      </ul>
      <hr />

      <h2>4. How We Use Information</h2>
      <p>We use information to:</p>
      <ul>
        <li>operate and maintain the platform;</li>
        <li>authenticate users;</li>
        <li>process transactions;</li>
        <li>facilitate storefront functionality;</li>
        <li>provide customer support;</li>
        <li>improve performance and reliability;</li>
        <li>detect fraud, abuse, and security threats;</li>
        <li>enforce our Terms and policies;</li>
        <li>communicate operational updates and notices;</li>
        <li>comply with legal obligations;</li>
        <li>investigate violations or disputes.</li>
      </ul>
      <hr />

      <h2>5. Payment Processing</h2>
      <p>
        Payments on SimplePress are processed by third-party payment processors,
        including Stripe.
      </p>
      <p>
        When making a purchase or operating a storefront, your payment
        information may be processed directly by Stripe subject to
        Stripe&rsquo;s own privacy practices and terms.
      </p>
      <p>
        SimplePress does not control Stripe&rsquo;s independent handling of
        payment data.
      </p>
      <hr />

      <h2>6. Cookies and Session Technologies</h2>
      <p>SimplePress may use:</p>
      <ul>
        <li>cookies;</li>
        <li>session tokens;</li>
        <li>authentication tokens;</li>
        <li>local storage;</li>
        <li>similar technologies</li>
      </ul>
      <p>to:</p>
      <ul>
        <li>maintain login sessions;</li>
        <li>secure accounts;</li>
        <li>remember preferences;</li>
        <li>improve platform functionality;</li>
        <li>support analytics and performance monitoring.</li>
      </ul>
      <p>
        You may be able to control certain cookie settings through your browser
        configuration.
      </p>
      <p>Disabling certain cookies may impact platform functionality.</p>
      <hr />

      <h2>7. Data Sharing and Disclosure</h2>
      <p>We do not sell personal information or user data.</p>
      <p>We may share information in limited circumstances, including:</p>
      <ul>
        <li>with service providers and infrastructure providers;</li>
        <li>with payment processors such as Stripe;</li>
        <li>with businesses involved in customer transactions;</li>
        <li>when required by law or legal process;</li>
        <li>to protect platform security and integrity;</li>
        <li>to investigate fraud, abuse, or illegal activity;</li>
        <li>during mergers, restructurings, or organizational transfers.</li>
      </ul>
      <p>
        We may also disclose information if we reasonably believe disclosure is
        necessary to:
      </p>
      <ul>
        <li>comply with legal obligations;</li>
        <li>enforce our Terms;</li>
        <li>protect users or the public;</li>
        <li>
          protect the rights or property of SimplePress or THE CENTER FOR
          GENERATIVE JUSTICE LLC.
        </li>
      </ul>
      <hr />

      <h2>8. User Content</h2>
      <p>
        Storefronts hosted on SimplePress may publicly display information
        uploaded by businesses, including:
      </p>
      <ul>
        <li>business names;</li>
        <li>product listings;</li>
        <li>images;</li>
        <li>branding;</li>
        <li>descriptions;</li>
        <li>storefront content.</li>
      </ul>
      <p>
        Users are responsible for ensuring that uploaded content does not
        violate privacy rights or applicable laws.
      </p>
      <hr />

      <h2>9. Data Retention</h2>
      <p>We retain information for as long as reasonably necessary to:</p>
      <ul>
        <li>operate the platform;</li>
        <li>maintain account integrity;</li>
        <li>comply with legal obligations;</li>
        <li>resolve disputes;</li>
        <li>enforce agreements;</li>
        <li>maintain security and backup systems.</li>
      </ul>
      <p>
        We may retain certain records after account closure where necessary for
        legal, operational, fraud prevention, tax, or security purposes.
      </p>
      <hr />

      <h2>10. Security</h2>
      <p>
        We implement reasonable administrative, technical, and organizational
        measures designed to protect information stored on the platform.
      </p>
      <p>However, no method of transmission or storage is completely secure.</p>
      <p>You acknowledge and agree that:</p>
      <ul>
        <li>internet communications are not guaranteed secure;</li>
        <li>no system can guarantee absolute security;</li>
        <li>you use the platform at your own risk.</li>
      </ul>
      <p>
        Users are responsible for maintaining the confidentiality of their
        account credentials.
      </p>
      <hr />

      <h2>11. Business Responsibility for Customer Data</h2>
      <p>
        Businesses operating storefronts on SimplePress are independently
        responsible for:
      </p>
      <ul>
        <li>complying with applicable privacy laws;</li>
        <li>handling customer information appropriately;</li>
        <li>responding to customer inquiries;</li>
        <li>maintaining lawful business practices.</li>
      </ul>
      <p>
        SimplePress provides platform infrastructure but does not independently
        control all business data practices conducted by storefront operators.
      </p>
      <hr />

      <h2>12. Children&rsquo;s Privacy</h2>
      <p>SimplePress is not intended for users under 18 years of age.</p>
      <p>
        We do not knowingly collect personal information from children under 18.
      </p>
      <p>
        If we become aware that information from a minor has been collected in
        violation of this policy, we may remove such information and terminate
        associated accounts.
      </p>
      <hr />

      <h2>13. International Use</h2>
      <p>
        SimplePress is primarily intended for users and businesses operating
        within the United States.
      </p>
      <p>
        Our infrastructure and data processing operations are generally
        conducted within the United States.
      </p>
      <p>
        By using the platform, you understand that your information may be
        transferred to and processed in the United States.
      </p>
      <hr />

      <h2>14. Your Rights and Choices</h2>
      <p>
        Depending on applicable law, users may have certain rights regarding
        their personal information, including the ability to:
      </p>
      <ul>
        <li>request access to information;</li>
        <li>request correction of inaccurate information;</li>
        <li>request deletion of certain information;</li>
        <li>close accounts;</li>
        <li>opt out of certain communications.</li>
      </ul>
      <p>We may decline requests where:</p>
      <ul>
        <li>required by law;</li>
        <li>necessary for security or fraud prevention;</li>
        <li>necessary to preserve operational integrity;</li>
        <li>necessary to comply with legal obligations.</li>
      </ul>
      <p>
        Requests may be submitted to:{" "}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
      </p>
      <hr />

      <h2>15. Third-Party Services and Links</h2>
      <p>
        SimplePress may integrate with or link to third-party services,
        including:
      </p>
      <ul>
        <li>payment processors;</li>
        <li>custom domains;</li>
        <li>external websites;</li>
        <li>embedded content providers;</li>
        <li>hosting infrastructure providers.</li>
      </ul>
      <p>
        We are not responsible for the privacy practices or content of
        third-party services.
      </p>
      <p>Users should review the policies of those services independently.</p>
      <hr />

      <h2>16. Platform Changes</h2>
      <p>SimplePress is an evolving platform.</p>
      <p>We may modify:</p>
      <ul>
        <li>platform features;</li>
        <li>data practices;</li>
        <li>analytics systems;</li>
        <li>infrastructure providers;</li>
        <li>operational processes</li>
      </ul>
      <p>as the platform develops.</p>
      <p>We reserve the right to update this Privacy Policy at any time.</p>
      <p>
        Updated versions will become effective upon posting unless otherwise
        stated.
      </p>
      <p>
        Continued use of the platform after updates constitutes acceptance of
        the revised policy.
      </p>
      <hr />

      <h2>17. Contact Information</h2>
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
        <Link href="/platform/policies/acceptable-use">
          Acceptable Use Policy
        </Link>{" "}
        &middot; <Link href="/platform/policies/disclaimer">Disclaimer</Link>{" "}
        &middot;{" "}
        <Link href="/platform/policies/inform-act">INFORM Act Notice</Link>
      </p>
    </div>
  );
}
