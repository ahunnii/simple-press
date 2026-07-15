import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "~/env";
import { verifyPartnerRequest } from "~/lib/partner-auth";
import { getClientIp, partnerApiLimiter } from "~/lib/rate-limit";

/**
 * GET /api/partner/health — lets Artisanal Futures verify the partner link
 * end to end (network, URL, bearer token, HMAC secret, and clock skew)
 * without any side effects. Spec: docs/integrations/artisanal-futures-provisioning.md.
 *
 * GET signature convention: HMAC over the canonical query string. This
 * endpoint takes no query params, so the signature is over the empty string
 * (i.e. hmac over `${timestamp}.`).
 */
export async function GET(req: NextRequest) {
  try {
    await partnerApiLimiter.consume(getClientIp(req));
  } catch {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const verification = verifyPartnerRequest(req, {
    bearer: env.AF_PARTNER_API_TOKEN,
    hmacSecret: env.AF_SP_WEBHOOK_SECRET,
    rawBody: "",
  });
  if (!verification.ok) {
    console.warn("[partner/health] auth failed:", verification.reason);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, service: "simple-press" });
}
