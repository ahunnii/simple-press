import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { MinimalTemplate } from "~/app/(storefront)/_templates/minimal-template";
import { ModernTemplate } from "~/app/(storefront)/_templates/modern-template";
import { VintageTemplate } from "~/app/(storefront)/_templates/vintage-template";
import { db } from "~/server/db";

export default async function StorefrontHomePage() {
  const headersList = await headers();
  const hostname = headersList.get("host") ?? "";

  // Extract subdomain or custom domain
  const domain = hostname.split(":")[0]; // Remove port

  // Find business by custom domain or subdomain
  const business = await db.business.findFirst({
    where: {
      OR: [
        { customDomain: domain },
        { subdomain: domain?.split(".")[0] }, // Extract subdomain
      ],
      status: "active",
    },
    include: {
      siteContent: true,
      products: {
        where: { published: true },
        include: {
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 12, // Featured products for homepage
      },
    },
  });

  if (!business) {
    notFound();
  }

  // Select template component based on business settings
  const TemplateComponent =
    {
      modern: ModernTemplate,
      vintage: VintageTemplate,
      minimal: MinimalTemplate,
    }[business.templateId] ?? ModernTemplate;

  return (
    <TemplateComponent
      business={
        business as unknown as {
          id: string;
          name: string;
          siteContent: {
            aboutTitle: string | null;
            heroTitle: string | null;
            heroSubtitle: string | null;
            aboutText: string | null;
            primaryColor: string | null;
          } | null;
          products: Array<{
            id: string;
            name: string;
            slug: string;
            price: number;
            images: Array<{ url: string; altText: string | null }>;
          }>;
        }
      }
    />
  );
}
