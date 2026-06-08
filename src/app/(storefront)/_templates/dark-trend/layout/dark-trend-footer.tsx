import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";

import type { DefaultFooterTemplateProps } from "../../types";
import { api } from "~/trpc/server";

export async function DarkTrendFooter({
  business,
}: DefaultFooterTemplateProps) {
  const currentYear = new Date().getFullYear();
  const email = business?.supportEmail;
  const phone = business?.phoneNumber;
  const address = business?.businessAddress;

  const navigationItems = business?.siteContent?.navigationItems as
    | { label: string; href: string }[]
    | undefined;

  const policies = await api.content.getSimplifiedPages({
    type: "policy",
  });

  const socialLinks = business?.siteContent?.socialLinks as
    | {
        instagram?: string;
        facebook?: string;
        twitter?: string;
      }
    | undefined;

  return (
    <footer className="border-t border-white/10 bg-[#121212] bg-[url('/dark-trend-footer.png')] bg-bottom bg-no-repeat">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            {business?.siteContent?.logoUrl ? (
              // N-3: wrap logo image in a link (text fallback already is one)
              <Link href="/" aria-label={`${business.name} home`}>
                <div className="relative aspect-video h-20 w-auto rounded-sm">
                  <Image
                    src={business.siteContent.logoUrl}
                    alt=""
                    sizes="(max-width: 768px) 100vw, 55px"
                    fill
                    className="object-cover"
                  />
                </div>
              </Link>
            ) : (
              <Link
                href="/"
                className="text-lg font-semibold tracking-widest text-white uppercase"
              >
                {business.name}
              </Link>
            )}

            {business.siteContent?.footerText && (
              <p className="mt-4 text-base text-white/60">
                {business.siteContent?.footerText}
              </p>
            )}
          </div>

          <div>
            {/* M-10: no h2 ancestor in footer — use <p> styled identically */}
            <p className="text-xs font-semibold tracking-widest text-white uppercase">
              Navigate
            </p>
            <ul className="mt-4 flex flex-col gap-3">
              {(navigationItems ?? [
                { href: "/shop", label: "Shop" },
                { href: "/contact", label: "Contact" },
                { href: "/about", label: "About" },
              ]).map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            {(email ?? phone ?? address) && (
              <>
                <p className="text-xs font-semibold tracking-widest text-white uppercase">
                  Reach Out
                </p>
                <ul className="mt-4 flex flex-col gap-3 text-sm text-white/70">
                  {!!address && <li>{address}</li>}
                  {!!phone && (
                    <li>
                      <a
                        href={`tel:${phone.replace(/\D/g, "")}`}
                        className="transition-colors hover:text-white"
                      >
                        {phone}
                      </a>
                    </li>
                  )}
                  {!!email && (
                    <li>
                      <a
                        href={`mailto:${email}`}
                        className="transition-colors hover:text-white"
                      >
                        {email}
                      </a>
                    </li>
                  )}
                </ul>
              </>
            )}

            <p className="text-xs font-semibold tracking-widest text-white uppercase">
              Follow Us On
            </p>
            <ul className="mt-4 flex flex-row gap-4">
              {socialLinks?.instagram && (
                <li>
                  <a
                    href={socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram (opens in new tab)"
                    className="text-white/70 transition-colors hover:text-white"
                  >
                    <svg
                      aria-hidden="true"
                      focusable="false"
                      width="22"
                      height="22"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="h-5 w-5"
                    >
                      <rect
                        x="2"
                        y="2"
                        width="20"
                        height="20"
                        rx="5"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="5"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                      />
                      <circle cx="17" cy="7" r="1.2" fill="currentColor" />
                    </svg>
                  </a>
                </li>
              )}
              {socialLinks?.facebook && (
                <li>
                  <a
                    href={socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook (opens in new tab)"
                    className="text-white/70 transition-colors hover:text-white"
                  >
                    <svg
                      aria-hidden="true"
                      focusable="false"
                      width="22"
                      height="22"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="h-5 w-5"
                    >
                      <rect
                        x="2"
                        y="2"
                        width="20"
                        height="20"
                        rx="5"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                      />
                      <path
                        d="M16 8.5h-1.5A1.5 1.5 0 0 0 13 10v2h-1.5v2H13v4h2v-4h1.1l.4-2H15v-1.1A.4.4 0 0 1 15.4 10H16V8.5z"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        fill="currentColor"
                      />
                    </svg>
                  </a>
                </li>
              )}
              {socialLinks?.twitter && (
                <li>
                  <a
                    href={socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Twitter (opens in new tab)"
                    className="text-white/70 transition-colors hover:text-white"
                  >
                    <svg
                      aria-hidden="true"
                      focusable="false"
                      width="22"
                      height="22"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="h-5 w-5"
                    >
                      <rect
                        x="2"
                        y="2"
                        width="20"
                        height="20"
                        rx="5"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                      />
                      <path
                        d="M19 7.5c-.4.2-.8.3-1.2.4.4-.3.7-.6.8-1.1-.4.2-.9.4-1.3.5A2.1 2.1 0 0 0 9.8 9c0 .2 0 .4.1.6C8.2 9.6 6.8 8.9 5.8 7.8c-.2.4-.3.7-.3 1.2 0 .8.4 1.5 1.1 1.9-.3 0-.7-.1-1-.3v.1c0 1.1.8 2 1.8 2.2-.2 0-.4.1-.7.1-.2 0-.4 0-.5-.1.3 1 1.2 1.7 2.2 1.7A4.3 4.3 0 0 1 5 17.1c-.3 0-.7 0-1-.1A6.1 6.1 0 0 0 8.3 18.5c7.5 0 11.6-6.2 11.6-11.6v-.5c.8-.6 1.2-1.1 1.4-1.8z"
                        fill="currentColor"
                      />
                    </svg>
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <p className="text-sm text-white/60">
          © {currentYear} {business.name}. All rights reserved.
        </p>

        <div className="flex items-center gap-4">
          {policies?.map((policy, idx) => (
            <Fragment key={policy.id || idx}>
              {!!idx && (
                <span aria-hidden="true" className="text-white/60">
                  {" "}
                  |{" "}
                </span>
              )}
              <p className="inline text-sm text-white/60">
                <Link
                  href={policy.slug}
                  className="underline transition-colors hover:text-white"
                >
                  {policy.title}
                </Link>
              </p>
            </Fragment>
          ))}
        </div>
      </div>
    </footer>
  );
}
