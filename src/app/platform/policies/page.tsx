import Link from "next/link";

const contactEmail =
  process.env.NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL ??
  "csdt@generativejustice.org";

const POLICIES = [
  {
    title: "Terms of Service",
    href: "/platform/policies/terms-of-service",
    updated: "May 29, 2026",
    description:
      "The agreement governing your access to and use of the SimplePress platform, including merchant and customer obligations, intellectual property, and dispute resolution.",
    audience: "All users",
  },
  {
    title: "Privacy Policy",
    href: "/platform/policies/privacy-policy",
    updated: "May 29, 2026",
    description:
      "How we collect, use, store, and share your personal information across the platform, merchant storefronts, and related services.",
    audience: "All users",
  },
  {
    title: "Acceptable Use Policy",
    href: "/platform/policies/acceptable-use",
    updated: "May 29, 2026",
    description:
      "Prohibited products, content, and conduct on the platform. Covers merchants, customers, and visitors, along with enforcement and escalation procedures.",
    audience: "All users",
  },
  {
    title: "Seller & Merchant Agreement",
    href: "/platform/policies/seller-merchant",
    updated: "May 29, 2026",
    description:
      "Terms specific to businesses operating storefronts on SimplePress — covering account responsibilities, fees, Stripe Connect, inventory, fulfillment, and chargebacks.",
    audience: "Merchants",
  },
  {
    title: "Cookie Policy",
    href: "/platform/policies/cookie",
    updated: "May 29, 2026",
    description:
      "What cookies and similar tracking technologies we use, why we use them, and how you can control or opt out.",
    audience: "All users",
  },
  {
    title: "DMCA Policy",
    href: "/platform/policies/dmca",
    updated: "May 29, 2026",
    description:
      "How to submit a copyright takedown notice or counter-notice under the Digital Millennium Copyright Act, and how we handle intellectual property disputes.",
    audience: "All users",
  },
  {
    title: "INFORM Consumers Act Notice",
    href: "/platform/policies/inform-act",
    updated: "May 29, 2026",
    description:
      "How SimplePress complies with the federal INFORM Consumers Act, which requires platforms to collect and verify high-volume seller identity information.",
    audience: "Merchants",
  },
  {
    title: "Platform Disclaimer",
    href: "/platform/policies/disclaimer",
    updated: "May 29, 2026",
    description:
      'SimplePress is provided "as is." This disclaimer covers warranty exclusions, liability limitations, and merchant responsibility for their own storefronts and transactions.',
    audience: "All users",
  },
  {
    title: "Accessibility Statement",
    href: "/platform/policies/accessibility",
    updated: "May 27, 2026",
    description:
      "Our commitment to WCAG 2.1 AA accessibility, known limitations in the current release, and how to report accessibility issues or request accommodations.",
    audience: "All users",
  },
];

const AUDIENCE_STYLES: Record<string, string> = {
  "All users": "bg-gray-100 text-gray-600",
  Merchants: "bg-blue-50 text-blue-700",
};

export default function PoliciesIndexPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12">
      <div className="mb-10">
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900">
          Platform Policies
        </h1>
        <p className="max-w-2xl text-base text-gray-600">
          These policies govern use of the SimplePress platform and all
          storefronts hosted on it. They are maintained by{" "}
          <strong>THE CENTER FOR GENERATIVE JUSTICE LLC</strong> and apply to
          merchants, customers, and visitors alike.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {POLICIES.map((policy) => (
          <Link
            key={policy.href}
            href={policy.href}
            className="group flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-900 group-hover:text-blue-700">
                {policy.title}
              </h2>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${AUDIENCE_STYLES[policy.audience] ?? "bg-gray-100 text-gray-600"}`}
              >
                {policy.audience}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-gray-600">
              {policy.description}
            </p>
            <p className="mt-auto text-xs text-gray-400">
              Updated {policy.updated}
            </p>
          </Link>
        ))}
      </div>

      <div className="mt-12 rounded-lg border border-gray-200 bg-gray-50 px-6 py-5">
        <h2 className="mb-1 text-sm font-semibold text-gray-800">Questions?</h2>
        <p className="text-sm text-gray-600">
          If you have questions about any of these policies, email us at{" "}
          <a
            href={`mailto:${contactEmail}`}
            className="text-blue-600 hover:underline"
          >
            {contactEmail}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
