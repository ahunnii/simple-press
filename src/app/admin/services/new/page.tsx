import { api } from "~/trpc/server";

import { TrailHeader } from "../../_components/trail-header";
import { ServiceForm } from "../_components/service-form";

export default async function NewServicePage() {
  const business = await api.business.getWith({ includeSiteContent: false });

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Services", href: "/admin/services" },
          { label: "New Service" },
        ]}
      />
      <ServiceForm storefrontTemplateId={business.templateId} />
    </>
  );
}

export const metadata = {
  title: "New Service",
};
