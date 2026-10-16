import type { JSONContent } from "@tiptap/core";
import { render } from "@react-email/components";
import { MarketingBroadcastEmail } from "~/emails/marketing-broadcast";

import { formatBusinessAddress } from "~/lib/address/format";
import { renderEmail } from "~/lib/email/render";

import { tiptapToEmailHtml } from "./tiptap-to-email";

/**
 * Stands in for the per-recipient unsubscribe URL in the frozen campaign
 * render. It is URL-safe (letters/underscores only) so no renderer escapes it.
 * The worker swaps in each recipient's real URL with `applyUnsubscribeUrl`.
 */
export const UNSUBSCRIBE_PLACEHOLDER = "__SP_UNSUBSCRIBE_URL__";

export type CampaignBusiness = {
  name: string;
  logoUrl?: string | null;
  ownerEmail?: string | null;
  addressStreet?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPostalCode?: string | null;
  /** Free-form display address; used only when no structured parts are set. */
  businessAddress?: string | null;
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
};

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
        () => tiptapToEmailHtml(input.bodyJson).text,
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
  const preview = input.previewText?.trim();
  let bodyHtml: string | undefined;
  if (input.contentFormat === "tiptap") {
    const explicit = input.bodyHtml?.trim();
    bodyHtml = explicit
      ? input.bodyHtml!
      : input.bodyJson
        ? tiptapToEmailHtml(input.bodyJson).html
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
  });
}

/** Substitutes the recipient's real unsubscribe URL for every placeholder. */
export function applyUnsubscribeUrl(s: string, url: string): string {
  return s.replaceAll(UNSUBSCRIBE_PLACEHOLDER, url);
}
