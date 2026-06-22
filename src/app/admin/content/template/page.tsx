import { notFound } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { api } from "~/trpc/server";

import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";
import { TrailHeader } from "../../_components/trail-header";
import { TemplateFieldsEditor } from "./_components/template-fields-editor";

export default async function TemplateFieldsPage() {
  const [business, flags] = await Promise.all([
    api.business.getWith({ includeSiteContent: true }),
    getBusinessFlags(),
  ]);

  if (!business.siteContent) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "Template Fields" },
        ]}
      />
      <HubSubNav hub="content" />
      <TemplateFieldsEditor
        business={business}
        siteContent={business.siteContent}
        embedsEnabled={flags.isEnabled("embeds")}
      />
    </>
  );
}

export const metadata = {
  title: "Template Fields",
};
