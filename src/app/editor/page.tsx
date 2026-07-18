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
  const [business, editorState, flags, session, cmsPages] = await Promise.all([
    api.business.getWith({}),
    api.content.getEditorState(),
    getBusinessFlags(),
    getSession(),
    api.content.getEditorPages(),
  ]);

  const sections = getSectionsForTemplate(business.templateId);
  const isPlatformAdmin = session?.user.platformRole === "PLATFORM_ADMIN";

  // Deep-link support: ?page=homepage&section=homepage.hero, or ?page=cms:<id>
  const sp = await searchParams;
  const rawPage = typeof sp.page === "string" ? sp.page : "homepage";
  // A `cms:<pageId>` deep link is only honored when it matches a real page —
  // otherwise fall back to the homepage (as an unknown template page does).
  const initialPage = rawPage.startsWith("cms:")
    ? cmsPages.some((p) => `cms:${p.id}` === rawPage)
      ? rawPage
      : "homepage"
    : rawPage;
  const initialSection = typeof sp.section === "string" ? sp.section : null;

  return (
    <VisualEditor
      businessId={business.id}
      businessName={business.name}
      templateId={business.templateId}
      customFields={editorState.customFields}
      previewCustomFields={editorState.previewCustomFields}
      hasDraft={editorState.hasDraft}
      cmsPages={cmsPages}
      sections={sections}
      embedsEnabled={flags.isEnabled("embeds")}
      mediaEnabled={flags.isEnabled("media")}
      initialPage={initialPage}
      initialSection={initialSection}
      isPlatformAdmin={isPlatformAdmin}
    />
  );
}
