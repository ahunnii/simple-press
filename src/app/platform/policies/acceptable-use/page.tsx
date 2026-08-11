import type { Metadata } from "next";
import Link from "next/link";
import { env } from "~/env";
import {
  POLICY_LAST_UPDATED,
  formatPolicyDate,
} from "~/lib/legal/policy-versions";

export const metadata: Metadata = {
  title: "Acceptable Use Policy | SimplePress",
  description: "Prohibited products, content, and conduct on the SimplePress platform.",
  alternates: {
    canonical: `https://${env.NEXT_PUBLIC_PLATFORM_DOMAIN}/platform/policies/acceptable-use`,
  },
};

const contactEmail =
  process.env.NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL ??
  "csdt@generativejustice.org";

export default function AcceptableUsePage() {
  return (
    <div className="prose prose-lg mx-auto w-full max-w-7xl px-4 py-8">
      <h1>SimplePress Acceptable Use Policy</h1>
      <p>
        <strong>Last Updated:</strong>{" "}
        {formatPolicyDate(POLICY_LAST_UPDATED.acceptableUse)}
      </p>

      <h2>1. Purpose</h2>
      <p>
        This Acceptable Use Policy (&ldquo;Policy&rdquo;) governs use of the
        SimplePress platform and services operated by THE CENTER FOR GENERATIVE
        JUSTICE LLC (&ldquo;SimplePress,&rdquo; &ldquo;we,&rdquo;
        &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
      </p>
      <p>This Policy applies to:</p>
      <ul>
        <li>businesses operating storefronts on SimplePress;</li>
        <li>customers using storefronts hosted on SimplePress;</li>
        <li>users of SimplePress Accounts;</li>
        <li>visitors interacting with the platform.</li>
      </ul>
      <p>
        By using SimplePress, you agree to comply with this Policy in addition
        to the SimplePress Terms of Service and other applicable policies.
      </p>
      <hr />

      <h2>2. Platform Philosophy</h2>
      <p>
        SimplePress is intended to support small businesses, creators, artisans,
        and community-oriented commerce.
      </p>
      <p>
        We aim to provide an accessible and low-cost ecommerce platform while
        maintaining a safe, lawful, respectful, and trustworthy environment for
        users and customers.
      </p>
      <p>
        Because SimplePress is a community-oriented platform, we reserve broad
        discretion in determining whether conduct or content is inconsistent
        with the spirit or intent of the platform.
      </p>
      <hr />

      <h2>3. Prohibited Activities</h2>
      <p>
        You may not use SimplePress to engage in activities that are unlawful,
        harmful, deceptive, abusive, exploitative, or disruptive.
      </p>
      <p>Prohibited activities include, but are not limited to:</p>
      <ul>
        <li>violating any applicable law or regulation;</li>
        <li>infringing intellectual property rights;</li>
        <li>fraud or deceptive business practices;</li>
        <li>phishing or impersonation;</li>
        <li>unauthorized access to systems or accounts;</li>
        <li>distributing malware, spyware, or harmful code;</li>
        <li>attempting to bypass platform security or restrictions;</li>
        <li>scraping, harvesting, or mass-collecting platform data;</li>
        <li>interfering with platform functionality or stability;</li>
        <li>spamming or unsolicited communications;</li>
        <li>manipulating reviews, ratings, or platform reputation systems;</li>
        <li>laundering money or facilitating illegal financial activity;</li>
        <li>evading platform enforcement actions;</li>
        <li>creating fake identities or fraudulent accounts;</li>
        <li>abusing customer information;</li>
        <li>conducting unauthorized surveillance or tracking;</li>
        <li>using automated systems to abuse platform infrastructure;</li>
        <li>reselling or exploiting the platform without authorization;</li>
        <li>attempting to reverse engineer or replicate the platform.</li>
      </ul>
      <hr />

      <h2>4. Prohibited Products and Services</h2>
      <p>
        Businesses may not use SimplePress to sell, distribute, promote, or
        facilitate:
      </p>

      <h3>Illegal or Dangerous Products</h3>
      <ul>
        <li>illegal goods or services;</li>
        <li>stolen property;</li>
        <li>counterfeit products;</li>
        <li>controlled substances;</li>
        <li>drug paraphernalia;</li>
        <li>illegal weapons;</li>
        <li>firearms or ammunition where prohibited;</li>
        <li>explosives or hazardous materials;</li>
        <li>products intended to facilitate illegal activity.</li>
      </ul>

      <h3>Adult and Exploitative Content</h3>
      <ul>
        <li>pornography;</li>
        <li>sexually explicit content;</li>
        <li>exploitative sexual material;</li>
        <li>child sexual abuse material;</li>
        <li>non-consensual intimate imagery;</li>
        <li>deepfake sexual content;</li>
        <li>escort or prostitution services.</li>
      </ul>

      <h3>Harmful or Abusive Content</h3>
      <ul>
        <li>hate speech;</li>
        <li>extremist propaganda;</li>
        <li>violent threats;</li>
        <li>harassment or bullying;</li>
        <li>content promoting self-harm or violence;</li>
        <li>discriminatory or abusive conduct.</li>
      </ul>

      <h3>Fraudulent or Deceptive Products</h3>
      <ul>
        <li>scams or pyramid schemes;</li>
        <li>counterfeit branding;</li>
        <li>fake reviews or testimonials;</li>
        <li>deceptive medical claims;</li>
        <li>deceptive financial claims;</li>
        <li>miracle cures or unsupported health products;</li>
        <li>manipulated or misleading listings.</li>
      </ul>

      <h3>Restricted Financial and Gambling Activity</h3>
      <ul>
        <li>unauthorized financial services;</li>
        <li>illegal gambling;</li>
        <li>unlicensed investment schemes;</li>
        <li>unregistered securities offerings;</li>
        <li>money laundering activities.</li>
      </ul>

      <h3>Digital Abuse and Malicious Activity</h3>
      <ul>
        <li>malware;</li>
        <li>viruses;</li>
        <li>credential theft tools;</li>
        <li>spyware;</li>
        <li>phishing kits;</li>
        <li>unauthorized hacking tools;</li>
        <li>malicious automation tools.</li>
      </ul>
      <hr />

      <h2>5. Intellectual Property and Copyright</h2>
      <p>Users may not upload or distribute content that infringes:</p>
      <ul>
        <li>copyrights;</li>
        <li>trademarks;</li>
        <li>patents;</li>
        <li>trade secrets;</li>
        <li>publicity rights;</li>
        <li>other intellectual property rights.</li>
      </ul>
      <p>
        Users are solely responsible for ensuring they have the necessary rights
        to:
      </p>
      <ul>
        <li>product images;</li>
        <li>logos;</li>
        <li>branding;</li>
        <li>text;</li>
        <li>media;</li>
        <li>AI-generated content;</li>
        <li>marketing materials.</li>
      </ul>
      <p>
        SimplePress complies with the Digital Millennium Copyright Act
        (&ldquo;DMCA&rdquo;) and reserves the right to remove allegedly
        infringing content or terminate repeat infringers.
      </p>
      <hr />

      <h2>6. AI-Generated Content</h2>
      <p>
        AI-generated or AI-assisted content is permitted on SimplePress only if:
      </p>
      <ul>
        <li>the user has the legal right to use it;</li>
        <li>it does not infringe intellectual property rights;</li>
        <li>it does not impersonate or exploit real individuals;</li>
        <li>it does not contain deceptive or unlawful content.</li>
      </ul>
      <p>
        Users are fully responsible for the legality and ownership of
        AI-generated content uploaded to the platform.
      </p>
      <p>
        SimplePress does not independently verify authenticity, ownership, or
        originality.
      </p>
      <hr />

      <h2>7. Customer Data and Privacy</h2>
      <p>
        Businesses using SimplePress must handle customer information
        responsibly and lawfully.
      </p>
      <p>Businesses may not:</p>
      <ul>
        <li>sell customer data unlawfully;</li>
        <li>misuse customer information;</li>
        <li>engage in unauthorized tracking;</li>
        <li>expose sensitive customer data;</li>
        <li>use customer data for abusive or deceptive practices.</li>
      </ul>
      <p>
        SimplePress reserves the right to investigate misuse of customer
        information.
      </p>
      <hr />

      <h2>8. Email and Communications</h2>
      <p>
        SimplePress may provide functionality related to transactional or
        operational communications.
      </p>
      <p>Users may not use the platform to:</p>
      <ul>
        <li>send spam;</li>
        <li>send deceptive communications;</li>
        <li>engage in phishing;</li>
        <li>distribute malware;</li>
        <li>conduct unauthorized mass marketing campaigns;</li>
        <li>violate anti-spam laws.</li>
      </ul>
      <p>
        Businesses are responsible for complying with applicable communication
        and marketing laws.
      </p>
      <hr />

      <h2>9. Security and Platform Integrity</h2>
      <p>Users may not:</p>
      <ul>
        <li>interfere with platform operations;</li>
        <li>overload infrastructure;</li>
        <li>exploit vulnerabilities;</li>
        <li>probe or scan systems without authorization;</li>
        <li>bypass security controls;</li>
        <li>attempt unauthorized access to accounts or systems.</li>
      </ul>
      <p>
        Security incidents or vulnerabilities should be reported to:{" "}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
      </p>
      <hr />

      <h2>10. Enforcement Rights</h2>
      <p>SimplePress reserves the right, at our sole discretion, to:</p>
      <ul>
        <li>investigate suspected violations;</li>
        <li>remove content;</li>
        <li>disable products or storefronts;</li>
        <li>suspend or terminate accounts;</li>
        <li>block domains or subdomains;</li>
        <li>limit platform access;</li>
        <li>preserve evidence;</li>
        <li>cooperate with law enforcement;</li>
        <li>report illegal activity;</li>
        <li>
          take any action necessary to protect the platform, users, or the
          public.
        </li>
      </ul>
      <p>Enforcement actions may occur with or without notice.</p>
      <hr />

      <h2>11. Repeat Violations</h2>
      <p>
        Users or businesses that repeatedly violate this Policy may be
        permanently removed from the platform.
      </p>
      <p>
        We reserve the right to deny future access to users previously suspended
        or terminated.
      </p>
      <hr />

      <h2>12. Platform Discretion</h2>
      <p>SimplePress is a privately operated platform.</p>
      <p>
        We reserve broad discretion to determine whether conduct, products,
        content, or activity are inconsistent with:
      </p>
      <ul>
        <li>this Policy;</li>
        <li>our Terms of Service;</li>
        <li>platform safety;</li>
        <li>community trust;</li>
        <li>operational integrity;</li>
        <li>the intended purpose of the platform.</li>
      </ul>
      <p>
        Not all prohibited conduct can be specifically listed in this Policy.
      </p>
      <hr />

      <h2>13. Changes to This Policy</h2>
      <p>We may modify this Policy at any time as the platform evolves.</p>
      <p>
        Updated versions become effective upon posting unless otherwise stated.
      </p>
      <p>
        Continued use of the platform constitutes acceptance of revised
        policies.
      </p>
      <hr />

      <h2>14. Contact Information</h2>
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
        &middot; <Link href="/platform/policies/disclaimer">Disclaimer</Link>
      </p>
    </div>
  );
}
