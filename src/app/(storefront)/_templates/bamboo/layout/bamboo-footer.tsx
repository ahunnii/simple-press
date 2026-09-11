import Link from "next/link";
import { Leaf } from "lucide-react";

import type { DefaultFooterTemplateProps } from "../../types";
import { fieldAttr } from "~/lib/preview/section-attrs";
import { api } from "~/trpc/server";

import { resolveFields } from "..";
import { BambooWaveDivider } from "../shared/bamboo-wave-divider";
import {
  BambooSocialIcons,
  readBambooSocialLinks,
} from "./bamboo-social-icons";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
] as const;

const columnHeadingClass =
  "mb-4 text-xs font-semibold tracking-widest text-[var(--bam-gold-soft)] uppercase";
const columnLinkClass =
  "text-sm text-[var(--bam-cream)]/80 transition-colors hover:text-[var(--bam-cream)]";

/**
 * BambooFooter — the forest slab. Four columns (brand + socials, quick links,
 * policies, connect) over a hairline-separated bottom bar carrying the
 * copyright and the owner-editable footer note.
 *
 * The slab opens with the template's canonical wave (signature moment #3) so
 * every page flows into the footer instead of hitting a hard forest edge. The
 * `<footer>` itself is transparent: the wave's negative top margin lets its
 * transparent-above area composite over whatever the previous section painted
 * (cream, cream-deep, or forest-deep), and the forest background starts on the
 * inner div below the curve. Every page's final section carries at least
 * `py-16`, so the 40/56px overlap never reaches content.
 */
export async function BambooFooter({ business }: DefaultFooterTemplateProps) {
  const email = business?.supportEmail;
  const phone = business?.phoneNumber;
  const name = business?.name ?? "Business Name";
  const footerTagline = business?.siteContent?.footerText;
  const address = business?.businessAddress;

  const policies = await api.content.getSimplifiedPages({
    type: "policy",
  });

  const navigationItems = business?.siteContent?.navigationItems as
    | { label: string; href: string }[]
    | undefined;

  const socialLinks = readBambooSocialLinks(business?.siteContent?.socialLinks);

  const f = resolveFields(business.siteContent?.customFields, [
    "bamboo.global.footer-note",
  ]);
  const footerNote = f["bamboo.global.footer-note"]?.trim() ?? "";

  return (
    <footer>
      <BambooWaveDivider className="pointer-events-none -mt-10 -mb-px block h-10 md:-mt-14 md:h-14" />

      <div className="bg-[var(--bam-forest)] text-[var(--bam-cream)]">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="flex flex-col gap-4">
              <Link href="/" className="flex items-center gap-2">
                <Leaf
                  className="size-5 text-[var(--bam-gold-soft)]"
                  aria-hidden="true"
                />
                <span className="font-serif text-xl">{name}</span>
              </Link>
              {!!footerTagline && (
                <p className="max-w-xs text-sm leading-relaxed text-[var(--bam-cream)]/80">
                  {footerTagline}
                </p>
              )}
              <BambooSocialIcons
                socialLinks={socialLinks}
                label={`Follow ${name}`}
                className="mt-1 gap-3"
                linkClassName="size-9 rounded-full border border-[var(--bam-gold-soft)]/40 text-[var(--bam-gold-soft)] hover:border-[var(--bam-gold-soft)] hover:bg-[var(--bam-forest-deep)] hover:text-[var(--bam-cream)]"
              />
            </div>

            {/* Quick links */}
            <div>
              <h2 className={columnHeadingClass}>Quick Links</h2>
              <nav className="flex flex-col gap-2.5" aria-label="Quick links">
                {(navigationItems ?? NAV_LINKS).map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={columnLinkClass}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Policies */}
            <div>
              <h2 className={columnHeadingClass}>Policies</h2>
              {policies.length > 0 ? (
                <nav
                  className="flex flex-col gap-2.5"
                  aria-label="Customer care links"
                >
                  {policies.map((link) => (
                    <Link
                      key={link.id}
                      href={`/${link.slug}`}
                      className={columnLinkClass}
                    >
                      {link.title}
                    </Link>
                  ))}
                </nav>
              ) : (
                <p className="text-sm text-[var(--bam-cream)]/60">
                  Policies coming soon.
                </p>
              )}
            </div>

            {/* Connect */}
            <div>
              <h2 className={columnHeadingClass}>Connect</h2>
              <address className="flex flex-col gap-2.5 text-sm text-[var(--bam-cream)]/80 not-italic">
                <span>{name}</span>
                {!!address && <span>{address}</span>}
                {!!phone && (
                  <a
                    href={`tel:${phone.replace(/\D/g, "")}`}
                    className="transition-colors hover:text-[var(--bam-cream)]"
                  >
                    {phone}
                  </a>
                )}
                {!!email && (
                  <a
                    href={`mailto:${email}`}
                    className="transition-colors hover:text-[var(--bam-cream)]"
                  >
                    {email}
                  </a>
                )}
              </address>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-[var(--bam-gold-soft)]/20 pt-8 text-center sm:flex-row sm:text-left">
            <p className="text-xs text-[var(--bam-cream)]/70">
              &copy; {new Date().getFullYear()} {name}. All rights reserved.
            </p>
            {!!footerNote && (
              <p
                className="text-xs tracking-wide text-[var(--bam-gold-soft)]"
                {...fieldAttr("bamboo.global.footer-note")}
              >
                {footerNote}
              </p>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
