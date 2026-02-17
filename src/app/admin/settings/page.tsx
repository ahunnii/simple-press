import { notFound } from "next/navigation";

import { api, HydrateClient } from "~/trpc/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import { SiteHeader } from "../_components/site-header";
import { BrandingSettings } from "./_components/branding-settings";
import { DomainSettings } from "./_components/domain-settings";
import { GeneralSettings } from "./_components/general-settings";
import { IntegrationsSettings } from "./_components/integrations-settings";
import { SeoSettings } from "./_components/seo-settings";

export default async function SettingsPage() {
  const business = await api.business.get();

  if (!business) {
    notFound();
  }

  return (
    <HydrateClient>
      <SiteHeader title="Settings" />
      <div className="admin-container">
        <>
          {/* <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="mt-1 text-gray-600">
              Manage your store settings and integrations
            </p>
          </div> */}

          {/* Tabs */}
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid w-full max-w-3xl grid-cols-5">
              <TabsTrigger value="general">General</TabsTrigger>

              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="domain">Domain</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <GeneralSettings business={business} />
            </TabsContent>
            {/* 
            <TabsContent value="branding">
              <BrandingSettings business={business} />
            </TabsContent> */}

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
        </>
      </div>
    </HydrateClient>
  );
}
