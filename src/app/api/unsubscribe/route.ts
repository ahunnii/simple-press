import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

import { getBusinessUrl } from "~/lib/business-url";
import { verifyUnsubscribeToken } from "~/lib/email/unsubscribe-token";
import { db } from "~/server/db";

type PageTone = "success" | "error" | "neutral";

// `neutral` is the badge/status for the placeholder link in test broadcasts —
// nothing succeeded or failed, so it gets neither the green nor the red.
function htmlPage(title: string, message: string, tone: PageTone): Response {
  const color =
    tone === "success" ? "#16a34a" : tone === "neutral" ? "#6b7280" : "#dc2626";
  const icon = tone === "success" ? "✅" : tone === "neutral" ? "✉️" : "⚠️";
  const badge =
    tone === "success" ? "Done" : tone === "neutral" ? "Test" : "Invalid link";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f9fafb;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);
      padding: 48px 40px;
      max-width: 440px;
      width: 100%;
      text-align: center;
    }
    .icon {
      font-size: 40px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 12px;
    }
    p {
      font-size: 15px;
      color: #6b7280;
      line-height: 1.6;
    }
    .badge {
      display: inline-block;
      margin-top: 20px;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 500;
      background: ${color}1a;
      color: ${color};
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <span class="badge">${badge}</span>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: tone === "error" ? 400 : 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// Shared by GET (clicked link) and POST (RFC 8058 One-Click
// List-Unsubscribe-Post) — both unsubscribe the same way given a token.
async function unsubscribeByToken(token: string | null): Promise<{
  success: boolean;
  title: string;
  message: string;
  /** Storefront origin of the business the token belongs to (success only). */
  storefrontUrl?: string;
}> {
  if (!token) {
    return {
      success: false,
      title: "Invalid link",
      message:
        "This unsubscribe link is missing a token. Please use the link from your email.",
    };
  }

  const payload = verifyUnsubscribeToken(token);

  // `!payload.customerId || !payload.businessId`: belt-and-braces on top of the
  // shape check in verifyUnsubscribeToken — an undefined id would be dropped
  // from the `where` below by Prisma and opt out every customer platform-wide.
  if (!payload?.customerId || !payload.businessId) {
    return {
      success: false,
      title: "Invalid link",
      message:
        "This unsubscribe link is invalid or has been tampered with. Please contact support if you believe this is an error.",
    };
  }

  // Idempotent update — safe to call even if already unsubscribed. This is a
  // CAN-SPAM-mandated flow, so a DB failure here must render the same
  // styled failure card the caller already uses for an invalid token,
  // rather than an unhandled Next.js error page.
  let storefrontUrl: string | undefined;
  try {
    const now = new Date();
    await db.customer.updateMany({
      where: {
        id: payload.customerId,
        businessId: payload.businessId,
      },
      data: { acceptsMarketing: false, marketingUnsubscribedAt: now },
    });

    // Per-campaign attribution: the token carries the recipient row id.
    // Scoped by customer + business so a token can never stamp someone else's
    // row; `unsubscribedAt: null` keeps the first click's timestamp.
    // Attribution is best-effort: the opt-out above is what the law requires,
    // so a failure here must not turn it into an error card.
    if (payload.r) {
      try {
        await db.marketingCampaignRecipient.updateMany({
          where: {
            id: payload.r,
            customerId: payload.customerId,
            businessId: payload.businessId,
            unsubscribedAt: null,
          },
          data: { unsubscribedAt: now },
        });
      } catch (error) {
        Sentry.captureException(error, {
          level: "warning",
          tags: { route: "unsubscribe", step: "recipient-attribution" },
          extra: { recipientId: payload.r },
        });
      }
    }

    // Only for the branded redirect on GET. A failed lookup must not turn a
    // successful unsubscribe into an error, so it falls back to the HTML card.
    try {
      const business = await db.business.findUnique({
        where: { id: payload.businessId },
        select: { subdomain: true, customDomain: true, domainStatus: true },
      });
      if (business) storefrontUrl = getBusinessUrl(business);
    } catch {
      storefrontUrl = undefined;
    }
  } catch (error) {
    console.error("Error processing unsubscribe request:", error);
    Sentry.captureException(error, {
      tags: { route: "unsubscribe" },
      // customerId/businessId are opaque internal IDs, not PII — never the
      // token or email address.
      extra: { customerId: payload.customerId, businessId: payload.businessId },
    });
    return {
      success: false,
      title: "Something went wrong",
      message:
        "We couldn't process your unsubscribe request right now. Please try again in a few minutes, or contact support if the problem persists.",
    };
  }

  return {
    success: true,
    title: "You've been unsubscribed",
    message:
      "You will no longer receive marketing emails. You can re-enable emails at any time from your account preferences.",
    storefrontUrl,
  };
}

// "Send test to myself" broadcasts embed this placeholder token. There is no
// customer behind it, so it never touches the database.
const TEST_TOKEN = "test";

const TEST_PAGE = {
  title: "This is a test email",
  message:
    "In a real campaign this link unsubscribes the customer from your marketing emails. Nothing was changed.",
};

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");
  if (token === TEST_TOKEN) {
    return htmlPage(TEST_PAGE.title, TEST_PAGE.message, "neutral");
  }
  const result = await unsubscribeByToken(token);
  // The unsubscribe has already happened; the redirect only lands the person on
  // the store's branded confirmation page (which offers a Resubscribe undo).
  if (result.success && result.storefrontUrl && token) {
    const target = new URL("/email-preferences", result.storefrontUrl);
    target.searchParams.set("s", "unsubscribed");
    target.searchParams.set("t", token);
    return NextResponse.redirect(target, 303);
  }
  return htmlPage(
    result.title,
    result.message,
    result.success ? "success" : "error",
  );
}

// Opt out of caching so the page is always served fresh
export const dynamic = "force-dynamic";

// Suppress Next.js from wrapping this in a redirect on non-GET
export const runtime = "nodejs";

// RFC 8058 One-Click List-Unsubscribe (List-Unsubscribe-Post header) — mail
// clients (Gmail, Outlook, etc.) POST here directly, with the token still in
// the `t` query param, and expect a plain 200/4xx response rather than HTML.
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");
  if (token === TEST_TOKEN) {
    return NextResponse.json({ success: true, message: TEST_PAGE.message });
  }
  const result = await unsubscribeByToken(token);
  return NextResponse.json(
    { success: result.success, message: result.message },
    { status: result.success ? 200 : 400 },
  );
}
