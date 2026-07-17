import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { getSectionsForTemplate } from "~/lib/template-sections";
import { getSession } from "~/server/better-auth/server";
import { api } from "~/trpc/server";

import { VisualEditor } from "./_components/visual-editor";

export const metadata = {
  title: "Site Editor",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function EditorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [business, editorState, flags, session] = await Promise.all([
    api.business.getWith({}),
    api.content.getEditorState(),
    getBusinessFlags(),
    getSession(),
  ]);

  const sections = getSectionsForTemplate(business.templateId);
  const isPlatformAdmin = session?.user.platformRole === "PLATFORM_ADMIN";

  // Deep-link support: ?page=homepage&section=homepage.hero
  const sp = await searchParams;
  const initialPage = typeof sp.page === "string" ? sp.page : "homepage";
  const initialSection = typeof sp.section === "string" ? sp.section : null;

  return (
    <VisualEditor
      businessId={business.id}
      businessName={business.name}
      templateId={business.templateId}
      customFields={editorState.customFields}
      previewCustomFields={editorState.previewCustomFields}
      hasDraft={editorState.hasDraft}
      sections={sections}
      embedsEnabled={flags.isEnabled("embeds")}
      mediaEnabled={flags.isEnabled("media")}
      initialPage={initialPage}
      initialSection={initialSection}
      isPlatformAdmin={isPlatformAdmin}
    />
  );
}
