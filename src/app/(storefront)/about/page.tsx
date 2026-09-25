import { notFound } from "next/navigation";

import { buildPageMetadata, loadSeoBusiness } from "~/lib/seo";
import {
  buildBreadcrumbSchema,
  buildWebPageSchema,
} from "~/lib/structured-data";
import { collectGalleryIds } from "~/lib/tiptap/gallery-ids";
import { api, HydrateClient } from "~/trpc/server";
import { JsonLd } from "~/components/json-ld";

import { getTemplate } from "../_templates/registry";

export default async function AboutPage() {
  const business = await api.business.simplifiedGet();
  if (!business) notFound();

  const t = getTemplate(business.templateId);

  const webPageSchema = buildWebPageSchema(business, {
    type: "AboutPage",
    name: "About",
    path: "/about",
  });
  const breadcrumbSchema = buildBreadcrumbSchema(business, [
    { name: "Home", path: "/" },
    { name: "About", path: "/about" },
  ]);

  // Every template's about page reads its rich-text body out of
  // `business.siteContent.customFields`, under a different key per
  // template (e.g. "storyRichContent", "aboutMissionBanner") — so rather
  // than chase each template's field name, walk the whole customFields
  // blob for gallery nodes (galleries are stored as string-encoded Tiptap
  // JSON inside it, same as elsewhere) and prefetch whichever are found.
  const galleryIds = collectGalleryIds(business.siteContent?.customFields);
  await Promise.all(
    galleryIds.map((galleryId) =>
      api.gallery.getByIdPublic.prefetch(galleryId).catch(() => undefined),
    ),
  );

  return (
    <HydrateClient>
      <JsonLd data={[webPageSchema, breadcrumbSchema]} />
      <t.AboutPage business={business} />
    </HydrateClient>
  );
}

export async function generateMetadata() {
  const business = await loadSeoBusiness("/about");
  return buildPageMetadata({
    business,
    path: "/about",
    pageMetaKey: "about",
    title: "About",
    description: business?.siteContent?.metaDescription,
  });
}
