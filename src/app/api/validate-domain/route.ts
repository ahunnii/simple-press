import { db } from "~/server/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");

  const business = await db.business.findFirst({
    where: { customDomain: domain, domainStatus: "ACTIVE" },
  });

  // Caddy expects 200 to allow, any non-200 to deny
  if (business) {
    return new Response("OK", { status: 200 });
  }
  return new Response("Not Found", { status: 404 });
}
