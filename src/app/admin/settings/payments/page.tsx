import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { auth } from "~/lib/auth";
import { prisma } from "~/server/db";
import { BrandingSettings } from "./_components/branding-settings";
import { DomainSettings } from "./_components/domain-settings";
import { GeneralSettings } from "./_components/general-settings";
import { IntegrationsSettings } from "./_components/integrations-settings";
import { SeoSettings } from "./_components/seo-settings";

export default async function SettingsPage() {
  // Get session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  // Get user's business
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { businessId: true },
  });

  if (!user?.businessId) {
    redirect("/admin/welcome");
  }

  // Get business with all settings
  const business = await prisma.business.findUnique({
    where: { id: user.businessId },
    include: {
      siteContent: true,
    },
  });

  if (!business) {
    redirect("/admin/welcome");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-gray-600">
            Manage your store settings and integrations
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="domain">Domain</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralSettings business={business} />
          </TabsContent>

          <TabsContent value="branding">
            <BrandingSettings business={business} />
          </TabsContent>

          <TabsContent value="integrations">
            <IntegrationsSettings business={business} />
          </TabsContent>

          <TabsContent value="domain">
            <DomainSettings business={business} />
          </TabsContent>

          <TabsContent value="seo">
            <SeoSettings business={business} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
