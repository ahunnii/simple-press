import type { Metadata } from "next";
import Link from "next/link";
import { env } from "~/env";

export const metadata: Metadata = {
  title: "Cookie Policy | SimplePress",
  description: "How SimplePress uses cookies and similar tracking technologies.",
  alternates: {
    canonical: `https://${env.NEXT_PUBLIC_PLATFORM_DOMAIN}/platform/policies/cookie`,
  },
};

const contactEmail =
  process.env.NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL ??
  "csdt@generativejustice.org";

export default function CookiePolicyPage() {
  return (
    <div className="prose prose-lg mx-auto w-full max-w-7xl px-4 py-8">
      <h1>SimplePress Cookie Policy</h1>

      <p>
        <strong>Last Updated:</strong> August 11, 2026
      </p>

      <h2>1. Introduction</h2>
      <p>
        This Cookie Policy explains how THE CENTER FOR GENERATIVE JUSTICE LLC
        (&ldquo;SimplePress,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
        &ldquo;our&rdquo;) uses cookies and similar technologies on:
      </p>
      <ul>
        <li>simplepress.dev;</li>
        <li>storefronts hosted on SimplePress;</li>
        <li>custom domains connected to the SimplePress platform;</li>
        <li>related services and applications.</li>
      </ul>
      <p>This Cookie Policy should be read alongside the:</p>
      <ul>
        <li>SimplePress Terms of Service;</li>
        <li>Privacy Policy;</li>
        <li>Acceptable Use Policy.</li>
      </ul>
      <p>
        By using SimplePress, you consent to the use of cookies and similar
        technologies as described in this Policy.
      </p>
      <hr />

      <h2>2. What Are Cookies?</h2>
      <p>
        Cookies are small text files stored on your device by your browser when
        you visit a website.
      </p>
      <p>Cookies help websites:</p>
      <ul>
        <li>remember user sessions;</li>
        <li>maintain login state;</li>
        <li>improve functionality;</li>
        <li>analyze usage;</li>
        <li>enhance security and performance.</li>
      </ul>
      <p>SimplePress may also use similar technologies such as:</p>
      <ul>
        <li>session tokens;</li>
        <li>local storage;</li>
        <li>authentication tokens;</li>
        <li>browser storage technologies.</li>
      </ul>
      <hr />

      <h2>3. Types of Cookies We Use</h2>

      <h3>A. Essential Cookies</h3>
      <p>These cookies are necessary for the operation of the platform.</p>
      <p>They may be used to:</p>
      <ul>
        <li>maintain login sessions;</li>
        <li>authenticate accounts;</li>
        <li>protect against unauthorized access;</li>
        <li>remember session state;</li>
        <li>support security and platform functionality.</li>
      </ul>
      <p>
        Without these cookies, certain parts of the platform may not function
        properly.
      </p>

      <h3>B. Analytics Cookies</h3>
      <p>
        SimplePress uses self-hosted analytics tools, including Umami Analytics,
        to understand how the platform is used and to improve reliability and
        performance.
      </p>
      <p>Analytics technologies may collect information such as:</p>
      <ul>
        <li>page visits;</li>
        <li>browser type;</li>
        <li>device information;</li>
        <li>approximate geographic region;</li>
        <li>referring pages;</li>
        <li>session activity;</li>
        <li>technical performance data.</li>
      </ul>
      <p>
        We use the analytics tools described in this section for operational and
        improvement purposes only.
      </p>
      <p>We do not use these analytics tools for:</p>
      <ul>
        <li>behavioral advertising;</li>
        <li>cross-site ad tracking;</li>
        <li>selling personal information;</li>
        <li>advertising profiles.</li>
      </ul>
      <p>
        Section C below describes security and fraud-prevention technologies,
        including Google reCAPTCHA, which also analyze visitor behavior. Those
        technologies are provided by third parties under their own terms and are
        not covered by the commitments above.
      </p>

      <h3>C. Security and Fraud Prevention Technologies</h3>
      <p>We may use cookies or related technologies to:</p>
      <ul>
        <li>detect suspicious activity;</li>
        <li>prevent fraud;</li>
        <li>protect accounts;</li>
        <li>investigate abuse;</li>
        <li>maintain platform integrity.</li>
      </ul>
      <p>
        As part of these protections, SimplePress uses Google reCAPTCHA on
        sign-in, sign-up, and password reset, and on certain storefront forms
        such as contact and testimonial submissions. reCAPTCHA runs invisibly
        and analyzes visitor behavior to help distinguish human visitors from
        automated bots. Information it collects is sent to Google and is subject
        to Google&rsquo;s own{" "}
        <a
          href="https://policies.google.com/privacy"
          rel="noopener noreferrer"
          target="_blank"
        >
          Privacy Policy
        </a>{" "}
        and{" "}
        <a
          href="https://policies.google.com/terms"
          rel="noopener noreferrer"
          target="_blank"
        >
          Terms of Service
        </a>
        .
      </p>

      <h3>D. Functional Cookies</h3>
      <p>Functional technologies may remember:</p>
      <ul>
        <li>user preferences;</li>
        <li>storefront settings;</li>
        <li>session-related information;</li>
        <li>accessibility or interface preferences.</li>
      </ul>
      <hr />

      <h2>4. Third-Party Services</h2>
      <p>
        SimplePress integrates with third-party providers that may use their own
        cookies or technologies, including:
      </p>
      <ul>
        <li>Stripe;</li>
        <li>hosting and infrastructure providers;</li>
        <li>embedded content providers.</li>
      </ul>
      <p>These third parties operate under their own policies and practices.</p>
      <p>SimplePress does not control third-party cookies or technologies.</p>
      <p>
        Users should review applicable third-party privacy and cookie policies
        independently.
      </p>
      <hr />

      <h2>5. How We Use Cookies</h2>
      <p>We use cookies and similar technologies to:</p>
      <ul>
        <li>operate the platform;</li>
        <li>maintain secure sessions;</li>
        <li>authenticate users;</li>
        <li>improve platform functionality;</li>
        <li>analyze performance and reliability;</li>
        <li>prevent abuse and fraud;</li>
        <li>support storefront functionality;</li>
        <li>maintain technical stability.</li>
      </ul>
      <p>
        We do not use cookies to sell personal information or operate
        advertising networks.
      </p>
      <hr />

      <h2>6. Your Choices</h2>
      <p>Most web browsers allow users to:</p>
      <ul>
        <li>block cookies;</li>
        <li>delete cookies;</li>
        <li>control cookie settings;</li>
        <li>configure privacy preferences.</li>
      </ul>
      <p>Disabling cookies may affect:</p>
      <ul>
        <li>login functionality;</li>
        <li>storefront features;</li>
        <li>session persistence;</li>
        <li>platform performance.</li>
      </ul>
      <p>
        Because some cookies are essential for platform operation, certain
        functionality may not work correctly if cookies are disabled.
      </p>
      <hr />

      <h2>7. Do Not Track Signals</h2>
      <p>Some browsers provide &ldquo;Do Not Track&rdquo; signals.</p>
      <p>
        Because there is currently no universally accepted standard for
        responding to such signals, SimplePress may not respond to all Do Not
        Track requests in a standardized manner.
      </p>
      <p>
        However, SimplePress does not use cookies for advertising profiling or
        cross-site behavioral advertising.
      </p>
      <hr />

      <h2>8. International Use</h2>
      <p>
        SimplePress is primarily intended for users within the United States.
      </p>
      <p>
        The platform currently does not provide region-specific cookie consent
        systems designed for jurisdictions such as the European Union.
      </p>
      <p>
        By using the platform, you acknowledge that cookies and similar
        technologies may be used as described in this Policy.
      </p>
      <hr />

      <h2>9. Changes to This Policy</h2>
      <p>We may update or modify this Cookie Policy as the platform evolves.</p>
      <p>
        Updated versions become effective upon posting unless otherwise stated.
      </p>
      <p>
        Continued use of the platform after updates constitutes acceptance of
        the revised policy.
      </p>
      <hr />

      <h2>10. Contact Information</h2>
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
        </Link>
      </p>
    </div>
  );
}
