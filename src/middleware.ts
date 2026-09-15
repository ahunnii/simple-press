import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  buildCsp,
  CSP_REPORT_ONLY_HEADER,
  generateNonce,
} from "~/lib/security/csp";

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") ?? "";
  const pathname = req.nextUrl.pathname;

  // Build a mutable headers copy; set x-sp-preview when ?__preview=1 is present.
  const requestHeaders = new Headers(req.headers);
  // Strip the headers we own before (re)deriving them, so a client cannot hand
  // a server component a forged value: `x-sp-preview` must come from the query
  // string alone, `x-nonce`/CSP must come from this middleware alone. Next
  // reads `content-security-policy` in preference to the report-only variant
  // when extracting the nonce for its inline scripts, so both are cleared.
  requestHeaders.delete("x-sp-preview");
  requestHeaders.delete("x-nonce");
  requestHeaders.delete("content-security-policy");
  // Always expose the current path (incl. query string) to server components via
  // a header, so canonical-host redirects can preserve search params.
  requestHeaders.set("x-pathname", `${pathname}${req.nextUrl.search}`);
  if (req.nextUrl.searchParams.get("__preview") === "1") {
    requestHeaders.set("x-sp-preview", "1");
  }

  // Content-Security-Policy, REPORT-ONLY. Violations go to Sentry; nothing is
  // ever blocked. Wrapped defensively: a failure here must degrade to "no CSP
  // on this request", never to a 500.
  //
  // The policy is set on the REQUEST headers as well as the response because
  // Next only stamps its own inline framework scripts with the nonce when it
  // finds one on an incoming CSP request header. Verified in Next 15.5.9
  // (`server/app-render/app-render.js`): it reads
  // `headers['content-security-policy'] || headers['content-security-policy-report-only']`,
  // so the report-only header alone is enough — no enforcing header is needed
  // anywhere in the chain.
  let cspHeader: string | null = null;
  try {
    const nonce = generateNonce();
    cspHeader = buildCsp(nonce);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set(CSP_REPORT_ONLY_HEADER, cspHeader);
  } catch {
    cspHeader = null;
  }

  // On the preview/staging deployment, keep the whole environment out of search
  // indexes (it serves a clone of prod data on preview.<platform-domain>).
  const isPreviewEnv = process.env.IS_PREVIEW_ENV === "true";
  const finalize = (res: NextResponse) => {
    if (isPreviewEnv) {
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    if (cspHeader) {
      res.headers.set(CSP_REPORT_ONLY_HEADER, cspHeader);
    }
    return res;
  };

  // Get platform domain from env. Use NEXT_PUBLIC_PLATFORM_DOMAIN — the var
  // that is declared in env.js and set everywhere else. The old PLATFORM_DOMAIN
  // was undeclared, so it was always undefined and silently fell back to
  // "localhost", breaking platform-vs-tenant routing in production.
  const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "localhost";
  const isDevelopment = process.env.NODE_ENV === "development";

  // Determine if this is the platform domain (no subdomain)
  const isPlatformDomain = isDevelopment
    ? hostname === "localhost:3000" || hostname === "localhost"
    : hostname === platformDomain || hostname === `mystore.${platformDomain}`;

  // Determine if this is the dedicated platform admin subdomain
  const isPlatformSubdomain = isDevelopment
    ? hostname === "platform.localhost:3000"
    : hostname === `platform.${platformDomain}`;

  // ========================================
  // PLATFORM DOMAIN (localhost:3000 in dev)
  // ========================================
  if (isPlatformDomain) {
    // Platform routes work normally
    return finalize(
      NextResponse.next({ request: { headers: requestHeaders } }),
    );
  }

  // ========================================
  // PLATFORM ADMIN SUBDOMAIN (platform.*)
  // ========================================
  if (isPlatformSubdomain) {
    // Infrastructure and auth routes pass through unchanged — auth must not be
    // rewritten into platform-hub or the layout's session redirect loops forever.
    if (
      pathname.startsWith("/api") ||
      pathname.startsWith("/auth") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon")
    ) {
      return finalize(
        NextResponse.next({ request: { headers: requestHeaders } }),
      );
    }

    const url = req.nextUrl.clone();

    url.pathname = `/platform-hub${pathname === "/" ? "" : pathname}`;
    return finalize(
      NextResponse.rewrite(url, { request: { headers: requestHeaders } }),
    );
  }

  // ========================================
  // TENANT DOMAINS (subdomains & custom domains)
  // ========================================

  // Admin, API, Auth routes work normally on tenant domains
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return finalize(
      NextResponse.next({ request: { headers: requestHeaders } }),
    );
  }

  // For any other paths on tenant domains, just pass through
  return finalize(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    "/((?!monitoring-tunnel|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
