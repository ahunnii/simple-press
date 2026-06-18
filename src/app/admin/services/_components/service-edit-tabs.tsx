"use client";

import type { RouterOutputs } from "~/trpc/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import { ServiceForm } from "./service-form";
import { ServiceItemsEditor } from "./service-items-editor";
import { ServiceTemplateFieldsEditor } from "./service-template-fields-editor";

type Props = {
  service: RouterOutputs["services"]["getById"];
  embedsEnabled?: boolean;
  storefrontTemplateId: string;
};

export function ServiceEditTabs({
  service,
  embedsEnabled,
  storefrontTemplateId,
}: Props) {
  return (
    <Tabs defaultValue="details" className="w-full">
      <div className="border-b bg-white px-4 py-2 sm:px-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="items">Specific services</TabsTrigger>
          <TabsTrigger value="content">Page content</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="details" className="mt-0">
        <ServiceForm
          service={service}
          storefrontTemplateId={storefrontTemplateId}
        />
      </TabsContent>

      <TabsContent value="items" className="mt-0">
        <div className="admin-container">
          <ServiceItemsEditor serviceId={service.id} items={service.items} />
        </div>
      </TabsContent>

      <TabsContent value="content" className="mt-0">
        <div className="admin-container">
          <ServiceTemplateFieldsEditor
            service={service}
            embedsEnabled={embedsEnabled}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}
