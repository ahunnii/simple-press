import { redirect } from "next/navigation";

import { api, HydrateClient } from "~/trpc/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import { BrandingSettings } from "./_components/branding-settings";
import { DomainSettings } from "./_components/domain-settings";
import { GeneralSettings } from "./_components/general-settings";
import { IntegrationsSettings } from "./_components/integrations-settings";
import { SeoSettings } from "./_components/seo-settings";

export default async function SettingsPage() {
  const business = await api.business.get();

  if (!business) {
    redirect("/admin/welcome");
  }

  return (
    <HydrateClient>
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
              <TabsTrigger value="integrations" disabled>
                Integrations
              </TabsTrigger>
              <TabsTrigger value="domain" disabled>
                Domain
              </TabsTrigger>
              <TabsTrigger value="seo" disabled>
                SEO
              </TabsTrigger>
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
    </HydrateClient>
  );
}
