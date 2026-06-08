import Link from "next/link";
import { Facebook, Instagram, Twitter } from "lucide-react";

import type { DefaultFooterTemplateProps } from "../../types";
import { api } from "~/trpc/server";

const DEFAULT_NAV_LINKS = [
  { href: "/shop", label: "All Products" },
  { href: "/collections", label: "Collections" },
  { href: "/about", label: "Our Story" },
  { href: "/blog", label: "Journal" },
];

const BRAND_LINKS = [
  { href: "/testimonials", label: "Reviews" },
  { href: "/contact", label: "Contact" },
];

export async function ElegantFooter({ business }: DefaultFooterTemplateProps) {
  const email = business?.supportEmail;
  const phone = business?.phoneNumber;
  const policies = await api.content.getSimplifiedPages({ type: "policy" });

  const navigationItems = business?.siteContent?.navigationItems as
    | { label: string; href: string }[]
    | undefined;

  const socialLinks = business?.siteContent?.socialLinks as
    | { instagram?: string; facebook?: string; twitter?: string }
    | undefined;

  const navLinks = navigationItems ?? DEFAULT_NAV_LINKS;

  return (
    <footer
      style={{
        background: "var(--el-ink, #1c1a17)",
        color: "var(--el-paper, #fbf8f2)",
        padding: "80px 40px 36px",
        marginTop: 0,
      }}
    >
      <div style={{ maxWidth: 1360, margin: "0 auto" }}>
        {/* 4-column grid */}
        <div
          className="el-footer-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: 40,
            paddingBottom: 60,
            borderBottom: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {/* Brand column */}
          <div>
            <div
              style={{
                fontFamily: "var(--font-serif, 'Cormorant Garamond', serif)",
                fontSize: 52,
                fontStyle: "italic",
                fontWeight: 500,
                lineHeight: 0.9,
                marginBottom: 22,
                letterSpacing: "0.01em",
              }}
            >
              <em>{business?.name}</em>
            </div>
            {business?.siteContent?.footerText && (
              <p
                style={{
                  fontSize: 14,
                  opacity: 0.7,
                  maxWidth: 320,
                  lineHeight: 1.65,
                  marginBottom: 24,
                  fontFamily: "var(--font-sans, sans-serif)",
                }}
              >
                {business.siteContent.footerText}
              </p>
            )}
            {/* Social icons */}
            <div style={{ display: "flex", gap: 12 }}>
              {socialLinks?.instagram && (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram (opens in new tab)"
                  style={{
                    width: 36,
                    height: 36,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.7)",
                    transition: "border-color 0.3s, color 0.3s",
                  }}
                >
                  <Instagram aria-hidden={true} style={{ width: 15, height: 15 }} />
                </a>
              )}
              {socialLinks?.facebook && (
                <a
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook (opens in new tab)"
                  style={{
                    width: 36,
                    height: 36,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  <Facebook aria-hidden={true} style={{ width: 15, height: 15 }} />
                </a>
              )}
              {socialLinks?.twitter && (
                <a
                  href={socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X / Twitter (opens in new tab)"
                  style={{
                    width: 36,
                    height: 36,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  <Twitter aria-hidden={true} style={{ width: 15, height: 15 }} />
                </a>
              )}
            </div>
          </div>

          {/* Nav columns — 3-col sub-grid so the <nav> landmark is preserved */}
          <nav
            aria-label="Footer navigation"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 40,
              gridColumn: "span 3",
            }}
          >
          {/* Shop column */}
          <FooterColumn title="Shop" links={navLinks} />

          {/* Brand links column */}
          <FooterColumn title={business?.name ?? "Brand"} links={BRAND_LINKS} />

          {/* Policies / Contact column */}
          <div>
            <FooterColHeading>Info</FooterColHeading>
            <ul role="list" style={{ listStyle: "none" }}>
              {policies.map((policy) => (
                <li key={policy.id} style={{ marginBottom: 10 }}>
                  <Link
                    href={policy.slug}
                    style={{
                      fontSize: 14,
                      opacity: 0.8,
                      color: "var(--el-paper, #fbf8f2)",
                      textDecoration: "none",
                      fontFamily: "var(--font-sans, sans-serif)",
                      transition: "opacity 0.3s",
                    }}
                  >
                    {policy.title}
                  </Link>
                </li>
              ))}
              {email && (
                <li style={{ marginBottom: 10 }}>
                  <a
                    href={`mailto:${email}`}
                    style={{
                      fontSize: 14,
                      opacity: 0.8,
                      color: "var(--el-paper, #fbf8f2)",
                      textDecoration: "none",
                    }}
                  >
                    {email}
                  </a>
                </li>
              )}
              {phone && (
                <li>
                  <a
                    href={`tel:${phone.replace(/\D/g, "")}`}
                    style={{
                      fontSize: 14,
                      opacity: 0.8,
                      color: "var(--el-paper, #fbf8f2)",
                      textDecoration: "none",
                    }}
                  >
                    {phone}
                  </a>
                </li>
              )}
            </ul>
          </div>
          </nav>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 32,
            fontFamily: "var(--font-mono, ui-monospace)",
            fontSize: 11,
            letterSpacing: "0.12em",
            color: "rgba(255,255,255,0.65)",
            textTransform: "uppercase",
          }}
        >
          <span>© {new Date().getFullYear()} {business?.name}</span>
          <span>Made with care</span>
        </div>
      </div>

    </footer>
  );
}

function FooterColHeading({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: "var(--font-mono, ui-monospace)",
        fontSize: 11,
        fontWeight: 400,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "rgba(255,255,255,0.65)",
        marginBottom: 18,
      }}
    >
      {children}
    </p>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <FooterColHeading>{title}</FooterColHeading>
      <ul role="list" style={{ listStyle: "none" }}>
        {links.map((link) => (
          <li key={link.href + link.label} style={{ marginBottom: 10 }}>
            <Link
              href={link.href}
              style={{
                fontSize: 14,
                opacity: 0.8,
                color: "var(--el-paper, #fbf8f2)",
                textDecoration: "none",
                fontFamily: "var(--font-sans, sans-serif)",
                transition: "opacity 0.3s",
              }}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
