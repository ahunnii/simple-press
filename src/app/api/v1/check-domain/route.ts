// import { NextResponse } from "next/server";

// import { db } from "~/server/db";

// export async function GET(request: Request) {
//   const { searchParams } = new URL(request.url);
//   const domain = searchParams.get("domain");

//   if (!domain) {
//     return new NextResponse("Domain parameter missing", { status: 400 });
//   }

//   // Check your database for the custom domain
//   const tenant = await db.business.findUnique({
//     where: {
//       OR: [
//         { customDomain: domain },
//         { subdomain: domain?.split(".")[0] }, // Extract subdomain
//       ],
//     },
//     select: { id: true, status: true },
//   });

//   // Return 200 only if the tenant exists and is active
//   if (tenant && tenant.status === "ACTIVE") {
//     return new NextResponse("OK", { status: 200 });
//   }

//   // Return 404 for any domain you don't recognize
//   return new NextResponse("Not Authorized", { status: 404 });
// }

import { NextResponse } from "next/server";

import { env } from "~/env";
import { db } from "~/server/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");

  if (!domain) return new NextResponse(null, { status: 400 });

  // 1. Logic for Subdomains (e.g., business-a.multiapp.com)
  if (domain.endsWith(`.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`)) {
    const slug = domain.replace(`.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`, "");
    const tenant = await db.business.findUnique({
      where: { subdomain: slug },
    });
    return tenant
      ? new NextResponse("OK", { status: 200 })
      : new NextResponse(null, { status: 404 });
  }

  // 2. Logic for Custom Domains (e.g., business-a.com)
  const tenant = await db.business.findUnique({
    where: { customDomain: domain },
  });

  return tenant
    ? new NextResponse("OK", { status: 200 })
    : new NextResponse(null, { status: 404 });
}
