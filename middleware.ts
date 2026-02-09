import { NextRequest, NextResponse } from "next/server";

// export async function middleware(req: NextRequest) {
//   const hostname = req.headers.get("host") ?? "";
//   const pathname = req.nextUrl.pathname;

//   // Get platform domain from env (fallback for development)
//   const platformDomain =
//     process.env.PLATFORM_DOMAIN ?? "shop-app.mycoolifyserver.com";
//   const isDevelopment = process.env.NODE_ENV === "development";

//   // In development, treat localhost as platform domain
//   const isPlatformDomain = isDevelopment
//     ? hostname.includes("localhost")
//     : hostname === platformDomain;

//   // ========================================
//   // 1. PLATFORM DOMAIN (no tenant)
//   // ========================================
//   if (isPlatformDomain) {
//     // Public routes on platform - allow access
//     const publicPlatformRoutes = [
//       "/",
//       "/signup",
//       "/login",
//       "/api/signup",
//       "/api/auth",
//     ];

//     const isPublicRoute = publicPlatformRoutes.some(
//       (route) => pathname === route || pathname.startsWith(route),
//     );

//     if (isPublicRoute) {
//       return NextResponse.next();
//     }

//     // Protected platform routes - redirect to login or home
//     return NextResponse.redirect(new URL("/", req.url));
//   }

//   // ========================================
//   // 2. TENANT DOMAINS (storefronts & admin)
//   // ========================================

//   // TODO: In production, query database for business
//   // For now, we'll add a placeholder

//   /*
//   const business = await prisma.business.findFirst({
//     where: {
//       OR: [
//         { customDomain: hostname },
//         { subdomain: hostname.split('.')[0] }
//       ]
//     },
//     select: {
//       id: true,
//       name: true,
//       templateId: true,
//       stripeAccountId: true,
//       umamiWebsiteId: true,
//       onboardingComplete: true,
//     }
//   });

//   if (!business) {
//     // Unknown domain - redirect to platform
//     return NextResponse.redirect(new URL(`https://${platformDomain}`));
//   }
//   */

//   // For Phase 1, just allow all tenant domains through
//   // We'll add authentication and business lookup in later phases
//   const response = NextResponse.next();

//   // Add headers for future use
//   // response.headers.set('x-tenant-id', business.id);
//   // response.headers.set('x-template-id', business.templateId);

//   return response;
// }

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") ?? "";
  const pathname = req.nextUrl.pathname;

  // Get platform domain from env
  const platformDomain = process.env.PLATFORM_DOMAIN ?? "localhost";
  const isDevelopment = process.env.NODE_ENV === "development";

  // Determine if this is the platform domain (no subdomain)
  const isPlatformDomain = isDevelopment
    ? hostname === "localhost:3000" || hostname === "localhost"
    : hostname === platformDomain || hostname === `shop-app.${platformDomain}`;

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
  const url = req.nextUrl.clone();

  if (pathname === "/") {
    url.pathname = "/(storefront)";
    return NextResponse.rewrite(url);
  }

  if (pathname.startsWith("/products")) {
    url.pathname = `/(storefront)${pathname}`;
    return NextResponse.rewrite(url);
  }

  if (pathname.startsWith("/cart") || pathname.startsWith("/checkout")) {
    url.pathname = `/(storefront)${pathname}`;
    return NextResponse.rewrite(url);
  }

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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
