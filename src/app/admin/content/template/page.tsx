import { notFound, redirect } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { getAvailableTemplates } from "~/lib/template-ownership";
import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { TemplatePicker } from "./_components/template-picker";
import { TemplateFieldsEditor } from "./_components/template-fields-editor";

export default async function TemplateFieldsPage() {
  // The raw field editor (JSON import/export, custom keys) is a platform-
  // admin support/build tool; owners and managers use the visual editor.
  const session = await getSession();
  if (session?.user.platformRole !== "PLATFORM_ADMIN") {
    redirect("/editor");
  }

  const [business, flags] = await Promise.all([
    api.business.getWith({ includeSiteContent: true }),
    getBusinessFlags(),
  ]);

  if (!business.siteContent) notFound();

  // Only offer templates this business is allowed to use (free templates plus
  // any commercial templates owned by its subdomain). All templates in dev.
  const availableTemplateIds = getAvailableTemplates(business.subdomain).map(
    (t) => t.value,
  );

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Site Setup", href: "/admin/content" },
          { label: "Template Fields" },
        ]}
      />
      <HubSubNav hub="content" />
      <div className="admin-container">
        <TemplatePicker
          currentTemplateId={business.templateId}
          availableTemplateIds={availableTemplateIds}
        />
      </div>
      <TemplateFieldsEditor
        business={business}
        siteContent={business.siteContent}
        embedsEnabled={flags.isEnabled("embeds")}
        mediaEnabled={flags.isEnabled("media")}
      />
    </>
  );
}

export const metadata = {
  title: "Template Fields",
};
