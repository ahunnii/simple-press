import * as Sentry from "@sentry/nextjs";
import { RateLimiterRes } from "rate-limiter-flexible";

import { verifyApiToken } from "~/lib/api-tokens";
import { buildBusinessProfile } from "~/lib/business-profile/build";
import { loadBusinessProfileSource } from "~/lib/business-profile/load";
import { apiTokenLimiter } from "~/lib/rate-limit";

/**
 * `GET https://{store host}/api/v1/business-profile` — the store's public
 * business + catalog profile (`simplepress.business-profile/v1`) for apps the
 * owner connected with an API token (Settings → Integrations).
 *
 * Auth: `Authorization: Bearer spk_…`, bound to the tenant the Host resolves
 * to. Every identity failure is the same bare 401 (never a 404, never a hint);
 * 403 only for a valid token without `profile:read`. Wire contract:
 * `src/lib/business-profile/types.ts`.
 */
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" } as const;

const unauthorized = () =>
  Response.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });

export async function GET(request: Request) {
  const auth = await verifyApiToken({
    authorization: request.headers.get("authorization"),
    host: request.headers.get("host") ?? "",
    scope: "profile:read",
  });
  if (!auth.ok) {
    return auth.status === 403
      ? Response.json(
          { error: "insufficient_scope" },
          { status: 403, headers: NO_STORE },
        )
      : unauthorized();
  }

  // Limiter infrastructure failures already fall back to memory inside
  // `makeLazy`; anything else that isn't a genuine limit rejection fails open
  // (the caller is authenticated and the data is public).
  try {
    await apiTokenLimiter.consume(auth.tokenId);
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      const retryAfter = Math.max(1, Math.ceil(err.msBeforeNext / 1000));
      return Response.json(
        { error: "rate_limited" },
        {
          status: 429,
          headers: { ...NO_STORE, "Retry-After": String(retryAfter) },
        },
      );
    }
    Sentry.captureException(err, {
      tags: { component: "business-profile-api", stage: "rate-limit" },
    });
  }

  const source = await loadBusinessProfileSource(auth.businessId);
  // The token row exists but its business vanished between the two reads.
  if (!source) return unauthorized();

  const profile = buildBusinessProfile(source, { now: new Date() });
  return Response.json(profile, { status: 200, headers: NO_STORE });
}
