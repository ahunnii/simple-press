import { type NextRequest, NextResponse } from "next/server";

import { db } from "~/server/db";
import { verifyUnsubscribeToken } from "~/lib/email/unsubscribe-token";

function htmlPage(title: string, message: string, success: boolean): Response {
  const color = success ? "#16a34a" : "#dc2626";
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
    <div class="icon">${success ? "✅" : "⚠️"}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <span class="badge">${success ? "Done" : "Invalid link"}</span>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: success ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");

  if (!token) {
    return htmlPage(
      "Invalid link",
      "This unsubscribe link is missing a token. Please use the link from your email.",
      false,
    );
  }

  const payload = verifyUnsubscribeToken(token);

  if (!payload) {
    return htmlPage(
      "Invalid link",
      "This unsubscribe link is invalid or has been tampered with. Please contact support if you believe this is an error.",
      false,
    );
  }

  // Idempotent update — safe to call even if already unsubscribed
  await db.customer.updateMany({
    where: {
      id: payload.customerId,
      businessId: payload.businessId,
    },
    data: { acceptsMarketing: false },
  });

  return htmlPage(
    "You've been unsubscribed",
    "You will no longer receive marketing emails. You can re-enable emails at any time from your account preferences.",
    true,
  );
}

// Opt out of caching so the page is always served fresh
export const dynamic = "force-dynamic";

// Suppress Next.js from wrapping this in a redirect on non-GET
export const runtime = "nodejs";

// Satisfy Next.js route exports — no POST needed
export function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
