import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") ?? "";
  const pathname = req.nextUrl.pathname;

  // Get platform domain from env
  const platformDomain = process.env.PLATFORM_DOMAIN ?? "localhost";
  const isDevelopment = process.env.NODE_ENV === "development";

  // Determine if this is the platform domain (no subdomain)
  const isPlatformDomain = isDevelopment
    ? hostname === "localhost:3000" || hostname === "localhost"
    : hostname === platformDomain || hostname === `mystore.${platformDomain}`;

  // ========================================
  // PLATFORM DOMAIN (localhost:3000 in dev)
  // ========================================
  if (isPlatformDomain) {
    // Platform routes work normally
    return NextResponse.next();
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
    return NextResponse.next();
  }

  // Storefront routes need to be rewritten to (storefront) group
  // const url = req.nextUrl.clone();

  // if (pathname === "/") {
  //   url.pathname = "/(storefront)";
  //   return NextResponse.rewrite(url);
  // }

  // if (pathname.startsWith("/products")) {
  //   url.pathname = `/(storefront)${pathname}`;
  //   return NextResponse.rewrite(url);
  // }

  // if (pathname.startsWith("/cart") || pathname.startsWith("/checkout")) {
  //   url.pathname = `/(storefront)${pathname}`;
  //   return NextResponse.rewrite(url);
  // }

  // For any other paths on tenant domains, just pass through
  return NextResponse.next();
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
