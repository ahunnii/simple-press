import { notFound } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { buildPageMetadata } from "~/lib/seo";
import { buildVideoObjectSchema } from "~/lib/structured-data";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { JsonLd } from "~/components/json-ld";

import { getTemplate } from "../_templates/registry";

export default async function VideosPage() {
  const { isEnabled } = await getBusinessFlags();
  if (!isEnabled("videos")) notFound();

  const business = await api.business
    .simplifiedGet()
    .catch(rethrowTrpcForErrorBoundary);
  if (!business) notFound();

  // The route already gates on the "videos" flag above, but getPublic's own
  // featureGate throws FORBIDDEN when the flag is off — this catch just
  // keeps the fetch from ever bubbling a raw tRPC error into the page,
  // matching the events/services pattern.
  const videos = await api.videos.getPublic().catch(() => []);

  const t = getTemplate(business.templateId);
  // VideosPage is optional in TemplateComponentSet (some templates may never
  // implement it), but defaultEntry always provides one, so this only
  // guards TypeScript's optional-slot typing — it should never 404 in
  // practice while the "videos" flag is on.
  if (!t.VideosPage) notFound();

  // VideoObject entities only — deliberately no ItemList, same reasoning the
  // /events index uses: these listings have no per-item detail URL on our
  // site (there is no /videos/[id] route), so every ListItem would carry
  // this same /videos path. A list that says "here are five items" and
  // points all five at itself adds no navigational information and just
  // duplicates the VideoObject markup below it. Skip the blob entirely when
  // there's nothing to describe.
  const jsonLd =
    videos.length > 0
      ? videos.map((video) => buildVideoObjectSchema(video))
      : null;

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      <t.VideosPage business={business} videos={videos} />
    </>
  );
}

export async function generateMetadata() {
  const business = await api.business.simplifiedGet().catch(() => null);
  return buildPageMetadata({ business, path: "/videos", title: "Videos" });
}
