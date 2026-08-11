import "server-only";

import { BusinessDomainStatus } from "generated/prisma";

import { env } from "~/env";
import { businessHostFilter } from "~/lib/domain-utils";
import { db } from "~/server/db";

/**
 * Platform-domain aliases that serve `/auth/*` but have **no `Business` row**.
 *
 * `mystore.<platform-domain>` is treated as the platform domain itself by
 * `src/middleware.ts` (`isPlatformDomain`), and `platform.<platform-domain>`
 * is the platform-admin subdomain (`isPlatformSubdomain`). All three labels
 * are in the reserved list in `src/lib/utils.ts` (`isSubdomainReserved`), so a
 * tenant can never own them — meaning the DB lookup below would return `null`
 * and every sign-in / sign-up / password-reset served on those hosts would be
 * rejected as an unknown captcha host. They must be allowed explicitly.
 *
 * Deliberately narrower than the full reserved list: the other reserved labels
 * (`www`, `admin`, `api`, …) are not routed as platform aliases and do not
 * serve auth, so allowing them would only widen the trust boundary.
 */
const PLATFORM_ALIAS_PREFIXES = ["mystore", "platform", "preview"] as const;

/**
 * Google's siteverify returns a **bare hostname** — no scheme, no port. Strip a
 * trailing `:<port>` and lower-case anyway so comparisons stay symmetric with
 * `Host` headers (which do carry a port in dev) and so a mixed-case host can't
 * slip past an equality check.
 */
function normalizeHost(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

/**
 * Is `hostname` a host this platform is willing to accept captcha tokens from?
 *
 * We run the reCAPTCHA v3 site key with **"Verify the origin of reCAPTCHA
 * solutions" turned off**, because one key serves the platform domain plus every
 * tenant subdomain and custom domain — an enumerable static allowlist on Google's
 * side is impossible. This function is the replacement for that check: a token is
 * only trusted if the host Google reports is one we actually serve.
 *
 * Accepted:
 *  1. The platform domain and its auth-serving aliases (see above).
 *  2. In development only, `localhost` and `*.localhost`.
 *  3. Otherwise, a live tenant in the database.
 *
 * The DB branch reuses `businessHostFilter` rather than hand-rolling a matcher.
 * Its docblock documents a real cross-tenant hazard: OR-ing `subdomain` and
 * `customDomain` lets a custom-domain host like `bloom.florist.com` resolve a
 * *different* tenant whose subdomain happens to be `bloom`. The filter keeps the
 * two matching modes strictly separate; we only tighten it further:
 *
 *  - `status: "active"` always (lowercase free-text column, `Business.status`) —
 *    a suspended or closed store must not mint trusted tokens.
 *  - `domainStatus: ACTIVE` when matching by custom domain (uppercase
 *    `BusinessDomainStatus` enum) — a `PENDING_DNS` domain has merely been
 *    *claimed* in the admin UI, not DNS-verified. Anyone can claim a string.
 *
 * **No caching, by design.** A cache would make a freshly-activated custom domain
 * fail captcha until the entry expired, which reads as a mysterious outage on the
 * tenant's launch day. Both `subdomain` and `customDomain` are `@unique`, so this
 * is a single indexed lookup (see the note at `prisma/schema.prisma:245`).
 */
export async function isKnownCaptchaHost(hostname: string): Promise<boolean> {
  const host = normalizeHost(hostname);
  if (!host) return false;

  const platformDomain = normalizeHost(env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "");
  if (platformDomain) {
    if (host === platformDomain) return true;
    if (
      PLATFORM_ALIAS_PREFIXES.some(
        (prefix) => host === `${prefix}.${platformDomain}`,
      )
    ) {
      return true;
    }
  }

  // Local development runs on `localhost` / `<tenant>.localhost`, neither of
  // which matches the production platform domain. Gated on NODE_ENV so it can
  // never widen the boundary in a deployed build.
  if (process.env.NODE_ENV === "development") {
    if (host === "localhost" || host.endsWith(".localhost")) return true;
  }

  const filter = businessHostFilter(host);
  const where =
    "customDomain" in filter
      ? {
          customDomain: filter.customDomain,
          status: "active",
          domainStatus: BusinessDomainStatus.ACTIVE,
        }
      : { subdomain: filter.subdomain, status: "active" };

  const business = await db.business.findFirst({
    where,
    select: { id: true },
  });

  return business !== null;
}
