import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";
import { resolveFlags } from "~/lib/features/resolve-flags";
import { fieldAttr, sectionGroupAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";

import { resolveFields } from "..";
import { BambooGlyph } from "../shared/bamboo-glyph";

const SWIPE_LINK_CLASS = "bamboo-swipe text-[0.98rem]";

export async function BambooFooter({ business }: DefaultFooterTemplateProps) {
  const { isEnabled } = resolveFlags(business?.featureFlags);

  const customFields = business?.siteContent?.customFields;
  const f = resolveFields(customFields, ["bamboo.global.footer-tagline"]);
  const tagline = f["bamboo.global.footer-tagline"] ?? "";

  const policies = await api.content.getSimplifiedPages({ type: "policy" });

  const name = business?.name ?? "Business";
  const address = business?.businessAddress;

  const shopLinks = [
    ...(isEnabled("products")
      ? [{ label: "All Products", href: "/shop" }]
      : []),
    ...(isEnabled("collections")
      ? [{ label: "Collections", href: "/collections" }]
      : []),
  ];

  const companyLinks = [
    { label: "About", href: "/about" },
    ...(isEnabled("testimonials")
      ? [{ label: "Testimonials", href: "/testimonials" }]
      : []),
    ...(isEnabled("blog") ? [{ label: "Insights", href: "/blog" }] : []),
    { label: "Contact", href: "/contact" },
    ...policies.map((p) => ({ label: p.title, href: p.slug })),
  ];

  return (
    <footer
      className="on-pine relative overflow-hidden bg-[var(--bamboo-pine)] pt-[74px] pb-10 text-[var(--bamboo-cream)]"
      {...sectionGroupAttr("global", "footer")}
    >
      {/* Scattered, cropped illustration strip along the top edge — not a
          neat row: irregular sizes/angles, several cropped by the fold. */}
      <div className="bamboo-foot-strip" aria-hidden="true">
        <svg viewBox="0 0 1440 104" preserveAspectRatio="xMidYMid slice">
          <use
            href="#s-roll-top"
            x="44"
            y="-18"
            width="86"
            height="86"
            transform="rotate(-8 87 25)"
          />
          <use
            href="#s-leaf"
            x="238"
            y="56"
            width="58"
            height="21"
            transform="rotate(17 267 66)"
          />
          <use
            href="#s-roll-front"
            x="404"
            y="18"
            width="52"
            height="50"
            transform="rotate(11 430 43)"
          />
          <use
            href="#s-leaf"
            x="783"
            y="24"
            width="41"
            height="15"
            transform="rotate(-24 803 31)"
          />
          <use
            href="#s-roll-top"
            x="926"
            y="34"
            width="62"
            height="62"
            transform="rotate(9 957 65)"
          />
          <use
            href="#s-roll-front"
            x="1211"
            y="-10"
            width="74"
            height="71"
            transform="rotate(-6 1248 25)"
          />
          <use
            href="#s-leaf"
            x="1367"
            y="62"
            width="49"
            height="18"
            transform="rotate(5 1391 71)"
          />
        </svg>
      </div>
      <span className="bamboo-foot-leaf" aria-hidden="true">
        <BambooGlyph id="s-leaf-l" />
      </span>

      <div className="relative mx-auto grid max-w-[1200px] [grid-template-columns:1.2fr_1fr_1fr] gap-10 px-6 max-[900px]:grid-cols-2 max-[620px]:grid-cols-1">
        <div className="max-[900px]:col-span-2 max-[620px]:col-span-1">
          <Link
            href="/"
            className="inline-flex items-center gap-[11px] text-[var(--bamboo-cream)]"
            aria-label={`${name} — home`}
          >
            <BambooGlyph id="s-wreath" className="h-9 w-auto shrink-0" />
            <b className="font-heading text-[1.28rem] leading-none font-bold tracking-[-0.02em]">
              {name}
            </b>
          </Link>
          {tagline ? (
            <p
              {...fieldAttr("bamboo.global.footer-tagline")}
              className="bamboo-foot-tagline"
            >
              {tagline}
            </p>
          ) : null}
        </div>

        {shopLinks.length > 0 ? (
          <nav aria-labelledby="bamboo-footer-shop">
            <h2 id="bamboo-footer-shop" className="bamboo-foot-heading">
              Shop
            </h2>
            <ul className="mt-4 grid gap-[11px]">
              {shopLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={SWIPE_LINK_CLASS}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        <nav aria-labelledby="bamboo-footer-company">
          <h2 id="bamboo-footer-company" className="bamboo-foot-heading">
            Company
          </h2>
          <ul className="mt-4 grid gap-[11px]">
            {companyLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={SWIPE_LINK_CLASS}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="bamboo-foot-bottom mx-auto max-w-[1200px] px-6 sm:items-center sm:justify-between">
        <span>
          {`© ${new Date().getFullYear()} ${name}`}
          {address ? ` · ${address}` : ""} · Proudly made in Detroit
        </span>
      </div>
    </footer>
  );
}
