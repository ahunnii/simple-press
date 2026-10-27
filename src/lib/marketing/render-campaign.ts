import type { JSONContent } from "@tiptap/core";
import { render } from "@react-email/components";
import { MarketingBroadcastEmail } from "~/emails/marketing-broadcast";

import type { ResolvedEmailStyle } from "./email-style";
import type { EmailBodyTheme } from "./tiptap-to-email";
import type { EmailLayoutTheme } from "~/emails/components/layout";
import { formatBusinessAddress } from "~/lib/address/format";
import { renderEmail } from "~/lib/email/render";
import { resolveSocialLinks } from "~/lib/social-links";

import { emailBodyThemeFromStyle, resolveEmailStyle } from "./email-style";
import { tiptapToEmailHtml } from "./tiptap-to-email";

/**
 * Stands in for the per-recipient unsubscribe URL in the frozen campaign
 * render. It is URL-safe (letters/underscores only) so no renderer escapes it.
 * The worker swaps in each recipient's real URL with `applyUnsubscribeUrl`.
 */
export const UNSUBSCRIBE_PLACEHOLDER = "__SP_UNSUBSCRIBE_URL__";

/**
 * Stands in for the per-recipient newsletter-confirm TOKEN (not the whole
 * URL) in a re-permission invite's render (`./repermission-invite.ts`). The
 * invite's button links to `buildNewsletterConfirmUrl(baseUrl, <this>)`,
 * which the body walker keeps as an absolute link (it would drop a bare
 * placeholder URL) and HTML-escapes (`&` → `&amp;`); a base64url token needs
 * no escaping in either the HTML or the text part, so the worker can swap it
 * in verbatim with `applyConfirmToken`. Substituted ONLY for REPERMISSION
 * campaigns: in any other campaign the string is left as is.
 */
export const CONFIRM_TOKEN_PLACEHOLDER = "__SP_CONFIRM_TOKEN__";

export type CampaignBusiness = {
  name: string;
  logoUrl?: string | null;
  /**
   * The store's public URL. Site-relative links in the body (`/contact`) are
   * resolved against it; without it they are left out of the email.
   */
  baseUrl?: string | null;
  ownerEmail?: string | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPostalCode?: string | null;
  /** Free-form display address; used only when no structured parts are set. */
  businessAddress?: string | null;
  /**
   * Storefront template; picks the email style's defaults. Missing/unknown
   * ids fall back to the Default template's.
   */
  templateId?: string | null;
  /** Raw `SiteContent.emailStyle` JSON (validated by `resolveEmailStyle`). */
  emailStyle?: unknown;
  /** Raw `SiteContent.socialLinks` JSON (`{ instagram, facebook, ... }`). */
  socialLinks?: unknown;
};

/**
 * The business's postal address for the CAN-SPAM footer, or `null` when it has
 * none. Campaign sending must be blocked while this is `null`.
 *
 * - Structured parts count only when street AND city AND (state OR postal
 *   code) are all non-blank. Then they are formatted via
 *   `formatBusinessAddress`.
 * - Otherwise the free-form `businessAddress` is used, but only when it is at
 *   least 10 characters after trimming and contains a digit or a comma. This
 *   admits PO boxes and international addresses while rejecting bare states
 *   or city names such as "MI" or "Detroit".
 */
export function getBusinessPostalAddress(
  business: Pick<
    CampaignBusiness,
    | "addressStreet"
    | "addressCity"
    | "addressState"
    | "addressPostalCode"
    | "businessAddress"
  >,
): string | null {
  const street = business.addressStreet?.trim() ?? "";
  const city = business.addressCity?.trim() ?? "";
  const state = business.addressState?.trim() ?? "";
  const postalCode = business.addressPostalCode?.trim() ?? "";
  if (street && city && (state || postalCode)) {
    return formatBusinessAddress({ street, city, state, postalCode });
  }
  const display = business.businessAddress?.trim() ?? "";
  if (display.length >= 10 && /[\d,]/.test(display)) return display;
  return null;
}

export type RenderCampaignInput = {
  business: CampaignBusiness;
  subject: string;
  previewText?: string | null;
  contentFormat: "text" | "tiptap";
  bodyText?: string | null;
  /**
   * Tiptap document for `contentFormat: "tiptap"`. Converted to email-safe
   * HTML by `tiptapToEmailHtml`.
   */
  bodyJson?: JSONContent | null;
  /**
   * Pre-sanitized HTML for `contentFormat: "tiptap"`, used instead of
   * `bodyJson` when given. The caller is responsible for sanitizing it.
   */
  bodyHtml?: string | null;
  /**
   * Replaces the stored `business.emailStyle` when given (the admin style
   * page previews unsaved settings with it).
   */
  styleOverride?: unknown;
  /**
   * Footer line explaining why the recipient got the email; omitted = the
   * standard "you opted in" line (see `MarketingBroadcastEmail`).
   */
  footerReason?: string;
};

/** Short labels for the footer's social row ("Instagram · Facebook · X"). */
const SOCIAL_LABELS: Record<string, string> = { twitter: "X" };

/**
 * The store's marketing email style for a campaign, as the walker's body
 * theme plus the layout theme. Resolved once per render.
 */
export function campaignEmailThemes(
  business: CampaignBusiness,
  styleOverride?: unknown,
): {
  style: ResolvedEmailStyle;
  body: EmailBodyTheme;
  layout: EmailLayoutTheme;
} {
  const style = resolveEmailStyle({
    emailStyle:
      styleOverride !== undefined ? styleOverride : business.emailStyle,
    templateId: business.templateId,
  });
  const socialLinks = style.showSocial
    ? resolveSocialLinks(business.socialLinks)
        // resolveSocialLinks also admits mailto:/tel:/relative values; an
        // email footer only gets absolute web links.
        .filter((link) => /^https?:\/\//i.test(link.url))
        .map((link) => ({
          label: SOCIAL_LABELS[link.key] ?? link.label,
          url: link.url,
        }))
    : [];
  return {
    style,
    body: emailBodyThemeFromStyle(style),
    layout: {
      pageBackground: style.pageBackground,
      fontStack: style.fontStack,
      header: style.header,
      logoHeight: style.logoHeight,
      socialLinks,
      footerNote: style.footerNote,
      linkColor: style.linkColor,
    },
  };
}

/** Stands in for the walker's plain text while the email's text is rendered. */
const BODY_TEXT_PLACEHOLDER = "__SP_BODY_TEXT__";

/**
 * Renders a campaign once, with `UNSUBSCRIBE_PLACEHOLDER` where the
 * unsubscribe link goes. The result is stored on the campaign so every retry
 * sends identical bytes; per-recipient URLs are substituted at send time.
 */
export async function renderCampaign(
  input: RenderCampaignInput,
): Promise<{ html: string; text: string }> {
  const email = campaignEmailElement(input, UNSUBSCRIBE_PLACEHOLDER);

  // A tiptap body's plain text comes from the walker (lists, links and
  // images read better than an HTML-to-text pass). The footer around it is
  // still rendered by the email itself, so the unsubscribe link and address
  // appear exactly as they do for plain-text campaigns.
  const useWalkerText =
    input.contentFormat === "tiptap" && !input.bodyHtml && !!input.bodyJson;
  const textEmail = useWalkerText
    ? campaignEmailElement(
        {
          ...input,
          bodyJson: null,
          bodyHtml: `<p>${BODY_TEXT_PLACEHOLDER}</p>`,
        },
        UNSUBSCRIBE_PLACEHOLDER,
      )
    : email;

  const [html, rawText] = await Promise.all([
    renderEmail(email),
    render(textEmail, { plainText: true }),
  ]);
  const text = useWalkerText
    ? rawText.replace(
        BODY_TEXT_PLACEHOLDER,
        () =>
          tiptapToEmailHtml(input.bodyJson, { baseUrl: input.business.baseUrl })
            .text,
      )
    : rawText;
  return { html, text };
}

/**
 * The campaign email as a React element with a concrete unsubscribe URL. The
 * single construction point for both the frozen render above and the owner's
 * test send (which goes through `sendEmail` with a `?t=test` link).
 */
export function campaignEmailElement(
  input: RenderCampaignInput,
  unsubscribeUrl: string,
) {
  const { business } = input;
  const themes = campaignEmailThemes(business, input.styleOverride);
  const preview = input.previewText?.trim();
  let bodyHtml: string | undefined;
  if (input.contentFormat === "tiptap") {
    const explicit = input.bodyHtml?.trim();
    bodyHtml = explicit
      ? input.bodyHtml!
      : input.bodyJson
        ? tiptapToEmailHtml(input.bodyJson, {
            baseUrl: business.baseUrl,
            theme: themes.body,
          }).html
        : "";
  }
  return MarketingBroadcastEmail({
    businessName: business.name,
    logoUrl: business.logoUrl ?? undefined,
    body: input.contentFormat === "text" ? (input.bodyText ?? "") : undefined,
    bodyHtml,
    unsubscribeUrl,
    previewText: preview === "" ? undefined : preview,
    postalAddress: getBusinessPostalAddress(business),
    theme: themes.layout,
    ...(input.footerReason ? { footerReason: input.footerReason } : {}),
  });
}

/** Substitutes the recipient's real unsubscribe URL for every placeholder. */
export function applyUnsubscribeUrl(s: string, url: string): string {
  return s.replaceAll(UNSUBSCRIBE_PLACEHOLDER, url);
}

/** Substitutes the recipient's confirm token (base64url) for every placeholder. */
export function applyConfirmToken(s: string, token: string): string {
  return s.replaceAll(CONFIRM_TOKEN_PLACEHOLDER, token);
}
