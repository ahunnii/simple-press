import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") ?? "";
  const pathname = req.nextUrl.pathname;

  // Build a mutable headers copy; set x-sp-preview when ?__preview=1 is present.
  const requestHeaders = new Headers(req.headers);
  if (req.nextUrl.searchParams.get("__preview") === "1") {
    requestHeaders.set("x-sp-preview", "1");
  }

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
    return NextResponse.next({ request: { headers: requestHeaders } });
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
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    const url = req.nextUrl.clone();

    // Strip the /admin/platform prefix so existing component links (e.g. hrefs
    // like /admin/platform/users inside UsersTable) resolve correctly here.
    let targetPath = pathname;
    if (pathname.startsWith("/admin/platform")) {
      targetPath = pathname.slice("/admin/platform".length) || "/";
    }

    url.pathname = `/platform-hub${targetPath === "/" ? "" : targetPath}`;
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
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
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // For any other paths on tenant domains, just pass through
  return NextResponse.next({ request: { headers: requestHeaders } });
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
