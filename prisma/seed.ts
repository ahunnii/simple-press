import { db } from "~/server/db";

async function main() {
  // Create a demo business for testing
  const business = await db.business.create({
    data: {
      name: "Demo Store",
      slug: "demo-store",
      subdomain: "demo",
      templateId: "modern",
      ownerEmail: "demo@example.com",
      status: "active",
      siteContent: {
        create: {
          heroTitle: "Welcome to Demo Store",
          heroSubtitle: "Quality products for everyone",
          primaryColor: "#3b82f6",
        },
      },
    },
  });

  console.log({ business });
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
