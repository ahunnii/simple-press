import { describe, expect, it } from "vitest";

import { verifyNewsletterConfirmToken } from "~/lib/email/newsletter-confirm-token";

import { inviteConfirmToken } from "./campaign-worker";
import { REPERMISSION_CONFIRM_LABEL } from "./consent-wording";
import { repermissionFooterReason } from "./queue-campaign";
import {
  applyConfirmToken,
  CONFIRM_TOKEN_PLACEHOLDER,
  renderCampaign,
} from "./render-campaign";
import {
  defaultRepermissionSubject,
  repermissionInviteDoc,
} from "./repermission-invite";

const business = {
  name: "Bloom & Co",
  baseUrl: "https://bloom.example.com",
  addressStreet: "1 Main St",
  addressCity: "Detroit",
  addressState: "MI",
  addressPostalCode: "48201",
};

async function renderInvite(note?: string) {
  return renderCampaign({
    business,
    subject: defaultRepermissionSubject(business.name),
    contentFormat: "tiptap",
    bodyJson: repermissionInviteDoc({ businessName: business.name, note }),
    footerReason: repermissionFooterReason(business.name),
  });
}

describe("re-permission invite render", () => {
  it("links the button to the store's confirm page with the token placeholder, in html and text", async () => {
    const { html, text } = await renderInvite();
    const url = `https://bloom.example.com/email-preferences?view=confirm&t=${CONFIRM_TOKEN_PLACEHOLDER}`;
    expect(html).toContain(`href="${url.replace("&", "&amp;")}"`);
    expect(html).toContain(REPERMISSION_CONFIRM_LABEL);
    expect(text).toContain(url);
    // The standard footer is kept: postal address + unsubscribe placeholder,
    // with the invite's own reason line.
    expect(html).toContain("1 Main St");
    expect(html).toContain("__SP_UNSUBSCRIBE_URL__");
    expect(html).toContain("before it moved to a new website");
    expect(html).not.toContain("because you opted in");
  });

  it("escapes the owner's note", async () => {
    const { html, text } = await renderInvite(
      'We <3 you\n\n<script>alert("x")</script>',
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(text).toContain("We <3 you");
  });

  it("substitutes a verifiable per-recipient token", async () => {
    const { html, text } = await renderInvite();
    const queuedAt = new Date("2026-10-26T12:00:00Z");
    const token = inviteConfirmToken(
      { businessId: "biz_1", invite: { queuedAt } },
      "Pat@Example.com",
    );
    // base64url + ".": needs no escaping in either part.
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    const personalized = applyConfirmToken(html, token);
    expect(personalized).not.toContain(CONFIRM_TOKEN_PLACEHOLDER);
    expect(applyConfirmToken(text, token)).toContain(`&t=${token}`);
    // Deterministic: a retry mints the same token.
    expect(
      inviteConfirmToken(
        { businessId: "biz_1", invite: { queuedAt } },
        "pat@example.com",
      ),
    ).toBe(token);

    const verified = verifyNewsletterConfirmToken(token, queuedAt);
    expect(verified).toMatchObject({
      ok: true,
      payload: {
        b: "biz_1",
        e: "pat@example.com",
        s: "imp",
        iat: queuedAt.getTime(),
      },
    });
  });
});
