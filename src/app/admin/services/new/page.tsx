import { api } from "~/trpc/server";

import { ServiceEditor } from "../_components/service-editor";
import { TrailHeader } from "../../_components/trail-header";

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
      <ServiceEditor storefrontTemplateId={business.templateId} />
    </>
  );
}

export const metadata = {
  title: "New Service",
};
