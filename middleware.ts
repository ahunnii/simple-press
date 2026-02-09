import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") ?? "";
  const pathname = req.nextUrl.pathname;

  // Get platform domain from env (fallback for development)
  const platformDomain =
    process.env.PLATFORM_DOMAIN ?? "shop-app.mycoolifyserver.com";
  const isDevelopment = process.env.NODE_ENV === "development";

  // In development, treat localhost as platform domain
  const isPlatformDomain = isDevelopment
    ? hostname.includes("localhost")
    : hostname === platformDomain;

  // ========================================
  // 1. PLATFORM DOMAIN (no tenant)
  // ========================================
  if (isPlatformDomain) {
    // Public routes on platform - allow access
    const publicPlatformRoutes = [
      "/",
      "/signup",
      "/login",
      "/api/signup",
      "/api/auth",
    ];

    const isPublicRoute = publicPlatformRoutes.some(
      (route) => pathname === route || pathname.startsWith(route),
    );

    if (isPublicRoute) {
      return NextResponse.next();
    }

    // Protected platform routes - redirect to login or home
    return NextResponse.redirect(new URL("/", req.url));
  }

  // ========================================
  // 2. TENANT DOMAINS (storefronts & admin)
  // ========================================

  // TODO: In production, query database for business
  // For now, we'll add a placeholder

  /*
  const business = await prisma.business.findFirst({
    where: {
      OR: [
        { customDomain: hostname },
        { subdomain: hostname.split('.')[0] }
      ]
    },
    select: {
      id: true,
      name: true,
      templateId: true,
      stripeAccountId: true,
      umamiWebsiteId: true,
      onboardingComplete: true,
    }
  });

  if (!business) {
    // Unknown domain - redirect to platform
    return NextResponse.redirect(new URL(`https://${platformDomain}`));
  }
  */

  // For Phase 1, just allow all tenant domains through
  // We'll add authentication and business lookup in later phases
  const response = NextResponse.next();

  // Add headers for future use
  // response.headers.set('x-tenant-id', business.id);
  // response.headers.set('x-template-id', business.templateId);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
