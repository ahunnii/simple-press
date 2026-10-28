import { Fragment } from "react";
import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import { isSvgUrl } from "~/lib/image-url";

/**
 * Optional marketing look (store email style, see
 * `~/lib/marketing/email-style.ts`). Only campaign emails pass it; without it
 * the layout renders exactly the neutral transactional look.
 */
export type EmailLayoutTheme = {
  pageBackground: string;
  /** CSS font-family value for the whole email. */
  fontStack: string;
  /** "logo-center" (default look), "logo-left", or "name" (always the text name). */
  header: "logo-center" | "logo-left" | "name";
  /** Logo height in px. */
  logoHeight: number;
  /** Shown as one centered row of text links above the footer line. */
  socialLinks?: Array<{ label: string; url: string }>;
  /** Owner's note, shown above the © line when non-empty. */
  footerNote?: string;
  /** Color for the social links. */
  linkColor: string;
};

type EmailLayoutProps = {
  children: React.ReactNode;
  previewText: string;
  businessName?: string;
  logoUrl?: string;
  footerText?: string;
  /** For non-transactional emails (welcome, testimonial invite). Pass the owner's email so recipients can opt out. */
  ownerEmail?: string;
  /** Marketing email style; omit for the neutral transactional look. */
  theme?: EmailLayoutTheme;
};

export function EmailLayout({
  children,
  previewText,
  businessName,
  logoUrl,
  footerText,
  ownerEmail,
  theme,
}: EmailLayoutProps) {
  // Gmail and Outlook don't render SVG, so an SVG logo falls back to the
  // business name instead of showing a broken image.
  const showLogo =
    Boolean(logoUrl) &&
    !isSvgUrl(logoUrl) &&
    // The "name" header shows the text name even when there is a logo.
    !(theme?.header === "name" && businessName);

  // Unthemed: the exact transactional style objects (byte-identical output).
  const left = theme?.header === "logo-left";
  const mainStyle = theme
    ? {
        ...main,
        backgroundColor: theme.pageBackground,
        fontFamily: theme.fontStack,
      }
    : main;
  const headerStyle = left ? { ...header, textAlign: "left" as const } : header;
  const logoStyle = theme
    ? {
        ...logo,
        margin: left ? "0" : logo.margin,
        height: `${theme.logoHeight}px`,
      }
    : logo;
  const socialLinks = theme?.socialLinks ?? [];
  const footerNote = theme?.footerNote?.trim() ?? "";

  return (
    <Html>
      <Head />
      {previewText ? <Preview>{previewText}</Preview> : null}
      <Body style={mainStyle}>
        <Container style={container}>
          {/* Logo/Header */}
          {showLogo && logoUrl ? (
            <Section style={headerStyle}>
              <Img src={logoUrl} alt={businessName} style={logoStyle} />
            </Section>
          ) : businessName ? (
            <Section style={headerStyle}>
              <Text style={brandName}>{businessName}</Text>
            </Section>
          ) : null}

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            {theme && socialLinks.length > 0 ? (
              <Text style={socialRowStyle}>
                {socialLinks.map((link, i) => (
                  <Fragment key={link.url}>
                    {i > 0 ? " · " : null}
                    <Link
                      href={link.url}
                      style={{ ...socialLinkStyle, color: theme.linkColor }}
                    >
                      {link.label}
                    </Link>
                  </Fragment>
                ))}
              </Text>
            ) : null}
            {footerNote ? (
              <Text style={footerNoteStyle}>{footerNote}</Text>
            ) : null}
            <Text style={footerTextStyle}>
              {footerText ??
                `© ${new Date().getFullYear()} ${businessName ?? ""}. All rights reserved.`}
            </Text>
            {ownerEmail && (
              <Text style={unsubscribeStyle}>
                To stop receiving these emails,{" "}
                <Link
                  href={`mailto:${ownerEmail}?subject=Unsubscribe`}
                  style={unsubscribeLink}
                >
                  reply with &ldquo;Unsubscribe&rdquo;
                </Link>{" "}
                or email {ownerEmail}.
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const header = {
  padding: "32px 24px",
  textAlign: "center" as const,
};

const logo = {
  margin: "0 auto",
  height: "48px",
};

const brandName = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#1f2937",
  margin: "0",
};

const content = {
  padding: "0 24px",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const footer = {
  padding: "0 24px",
};

const footerTextStyle = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "24px",
  textAlign: "center" as const,
};

const unsubscribeStyle = {
  color: "#9ca3af",
  fontSize: "11px",
  lineHeight: "20px",
  textAlign: "center" as const,
  marginTop: "8px",
};

const unsubscribeLink = {
  color: "#9ca3af",
};

const socialRowStyle = {
  fontSize: "12px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "0 0 8px",
};

const socialLinkStyle = {
  textDecoration: "underline",
};

const footerNoteStyle = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "20px",
  textAlign: "center" as const,
  whiteSpace: "pre-line" as const,
  margin: "0 0 4px",
};
