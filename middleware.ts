import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") ?? "";
  const pathname = req.nextUrl.pathname;

  // ========================================
  // 1. PLATFORM DOMAIN (no tenant)
  // ========================================
  if (hostname === "shop-app.mycoolifyserver.com") {
    // Public routes on platform
    if (
      pathname === "/" ||
      pathname === "/signup" ||
      pathname === "/login" ||
      pathname.startsWith("/api/signup") ||
      pathname.startsWith("/api/auth")
    ) {
      return NextResponse.next(); // Allow access
    }

    // Everything else on platform requires redirect
    return NextResponse.redirect(new URL("/", req.url));
  }

  // ========================================
  // 2. TENANT DOMAINS (storefronts & admin)
  // ========================================

  // Find business by domain
  const business = await db.business.findFirst({
    where: {
      OR: [{ customDomain: hostname }, { subdomain: hostname.split(".")[0] }],
    },
    select: {
      id: true,
      name: true,
      templateId: true,
      stripeAccountId: true,
      umamiWebsiteId: true,
      onboardingComplete: true,
    },
  });

  if (!business) {
    // Unknown domain - redirect to platform
    return NextResponse.redirect(
      new URL("https://shop-app.mycoolifyserver.com"),
    );
  }

  // Admin routes
  if (pathname.startsWith("/admin")) {
    const session = await getSession(req);

    // Require authentication
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Verify user owns this business
    if (session.businessId !== business.id) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    // Allow access to admin
    const response = NextResponse.next();
    response.headers.set("x-tenant-id", business.id);
    return response;
  }

  // Storefront routes
  const response = NextResponse.next();
  response.headers.set("x-tenant-id", business.id);
  response.headers.set("x-template-id", business.templateId);
  response.headers.set("x-umami-id", business.umamiWebsiteId || "");

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
