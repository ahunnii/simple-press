import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { consentRequestMeta } from "~/lib/marketing/consent-log";
import {
  applyUnsubscribe,
  resolveUnsubscribeToken,
} from "~/lib/marketing/unsubscribe";

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

// "Send test to myself" broadcasts embed this placeholder token. There is no
// customer behind it, so it never touches the database.
const TEST_TOKEN = "test";

const TEST_PAGE = {
  title: "This is a test email",
  message:
    "In a real campaign this link unsubscribes the customer from your marketing emails. Nothing was changed.",
};

// GET never writes. Mail clients and security scanners prefetch every link in
// an email, so a GET that unsubscribed would silently opt people out. GET only
// resolves the token and sends the person to the store's branded
// /email-preferences page, where pressing "Unsubscribe" POSTs here.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");
  if (token === TEST_TOKEN) {
    return htmlPage(TEST_PAGE.title, TEST_PAGE.message, "neutral");
  }
  const result = await resolveUnsubscribeToken(token);
  if (!result.ok) return htmlPage(result.title, result.message, "error");
  const target = new URL("/email-preferences", result.storefrontUrl);
  target.searchParams.set("s", "confirm");
  target.searchParams.set("t", result.token);
  return NextResponse.redirect(target, 303);
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
  // `via=page` is set by the Unsubscribe button on /email-preferences; any
  // other POST is the mail client's RFC 8058 one-click.
  const source =
    request.nextUrl.searchParams.get("via") === "page"
      ? "UNSUBSCRIBE_LINK"
      : "ONE_CLICK";
  const result = await applyUnsubscribe(token, {
    source,
    ...consentRequestMeta(request.headers),
  });
  return NextResponse.json(
    { success: result.ok, message: result.message },
    { status: result.ok ? 200 : 400 },
  );
}
