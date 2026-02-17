import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { TemplateFieldsEditor } from "../_components/template-fields-editor";
import { TrailHeader } from "../../_components/trail-header";

export default async function TemplateFieldsPage() {
  const business = await api.business.get();
  if (!business) notFound();
  if (!business.siteContent) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Template Fields" },
        ]}
      />
      <TemplateFieldsEditor
        business={business}
        siteContent={business.siteContent}
      />
    </>
  );
}

export const metadata = {
  title: "Template Fields",
};
