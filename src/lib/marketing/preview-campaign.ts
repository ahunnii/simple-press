import type { JSONContent } from "@tiptap/core";

import type { CampaignBusiness } from "./render-campaign";
import { renderEmail } from "~/lib/email/render";

import { campaignEmailElement, campaignEmailThemes } from "./render-campaign";
import { tiptapToEmailHtml } from "./tiptap-to-email";

/** Stands in for the per-recipient unsubscribe link in an admin preview. */
export const PREVIEW_UNSUBSCRIBE_URL = "#unsubscribe-preview";

/**
 * Renders a campaign the way it will be sent (same walker, theme and layout as
 * `renderCampaign`) for the admin's live preview. Nothing is stored or sent.
 *
 * - `styleOverride` undefined = the store's saved style; null = template
 *   defaults; an object = that (possibly unsaved) style.
 * - A missing postal address does not block a preview: the footer simply
 *   omits it (sending is what requires it).
 */
export async function renderCampaignPreview({
  business,
  previewText,
  bodyJson,
  styleOverride,
}: {
  business: CampaignBusiness;
  previewText?: string | null;
  bodyJson: JSONContent | null;
  styleOverride?: unknown;
}): Promise<{ html: string; warnings: string[] }> {
  const themes = campaignEmailThemes(business, styleOverride);
  const walked = bodyJson
    ? tiptapToEmailHtml(bodyJson, {
        baseUrl: business.baseUrl,
        theme: themes.body,
      })
    : { html: "", warnings: [] as string[] };

  const html = await renderEmail(
    campaignEmailElement(
      {
        business,
        subject: "",
        previewText,
        contentFormat: "tiptap",
        // The walker's own output, so the body is converted once.
        bodyHtml: walked.html,
        bodyJson: null,
        styleOverride,
      },
      PREVIEW_UNSUBSCRIBE_URL,
    ),
  );
  return { html, warnings: walked.warnings };
}

/**
 * The store's social links as the email footer would list them (absolute web
 * links only), regardless of whether the style currently shows them.
 */
export function emailSocialLinks(
  business: CampaignBusiness,
): Array<{ label: string; url: string }> {
  return (
    campaignEmailThemes(business, { showSocial: true }).layout.socialLinks ?? []
  );
}
