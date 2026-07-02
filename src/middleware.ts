import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") ?? "";
  const pathname = req.nextUrl.pathname;

  // Build a mutable headers copy; set x-sp-preview when ?__preview=1 is present.
  const requestHeaders = new Headers(req.headers);
  // Always expose the current path (incl. query string) to server components via
  // a header, so canonical-host redirects can preserve search params.
  requestHeaders.set("x-pathname", `${pathname}${req.nextUrl.search}`);
  if (req.nextUrl.searchParams.get("__preview") === "1") {
    requestHeaders.set("x-sp-preview", "1");
  }

  // On the preview/staging deployment, keep the whole environment out of search
  // indexes (it serves a clone of prod data on preview.<platform-domain>).
  const isPreviewEnv = process.env.IS_PREVIEW_ENV === "true";
  const finalize = (res: NextResponse) => {
    if (isPreviewEnv) {
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    return res;
  };

  // Get platform domain from env
  const platformDomain = process.env.PLATFORM_DOMAIN ?? "localhost";
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
