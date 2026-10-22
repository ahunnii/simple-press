import { describe, expect, it, vi } from "vitest";

import type { MaterialPolicyUpdate } from "~/lib/legal/material-updates";

import { renderPolicyUpdateNoticeEmail } from "./templates";

vi.mock("./send", () => ({
  sendEmail: vi.fn(),
  EMAIL_FROM: {
    NOREPLY: "noreply@test.dev",
    ORDERS: "orders@test.dev",
    SUPPORT: "support@test.dev",
    MARKETING: "marketing@test.dev",
  },
}));
vi.mock("./overrides.server", () => ({
  getEmailOverrides: () => Promise.resolve({}),
}));

const UPDATE: MaterialPolicyUpdate = {
  id: "2027-01-both",
  documents: ["merchant", "platform"],
  announcedOn: "2027-01-05",
  effectiveOn: "2027-02-05",
  summary: "We now charge a 1% platform fee on orders.",
};

describe("renderPolicyUpdateNoticeEmail", () => {
  it("renders subject, summary, absolute policy links and the continued-use sentence", async () => {
    const { subject, html, text } = await renderPolicyUpdateNoticeEmail({
      update: UPDATE,
      platformDomain: "simplepress.dev",
      now: new Date("2027-01-10T12:00:00.000Z"),
    });

    expect(subject).toBe(
      "Updates to SimplePress policies — effective February 5, 2027",
    );
    for (const body of [html, text]) {
      expect(body).toContain("We now charge a 1% platform fee on orders.");
      expect(body).toContain("February 5, 2027");
      expect(body).toContain("help@generativejustice.org");
      expect(body).toContain(
        "If you keep using SimplePress after February 5, 2027, the updated terms apply.",
      );
      expect(body).toContain(
        "https://simplepress.dev/platform/policies/seller-merchant",
      );
      expect(body).toContain(
        "https://simplepress.dev/platform/policies/privacy-policy",
      );
    }
    // Legal notice, not marketing: no unsubscribe affordance.
    expect(html.toLowerCase()).not.toContain("unsubscribe");
  });

  it("switches to past-tense wording once the update is in effect", async () => {
    const { html } = await renderPolicyUpdateNoticeEmail({
      update: UPDATE,
      platformDomain: "simplepress.dev",
      now: new Date("2027-03-01T12:00:00.000Z"),
    });
    expect(html).toContain("took effect on February 5, 2027");
    expect(html).not.toContain("before then");
  });
});
