import { notFound } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { parseSeoEditorTab } from "~/lib/seo/editor-tabs";
import { computeSeoScorecard } from "~/lib/seo/scorecard";
import { STATIC_SEO_ROUTES } from "~/lib/validators/site-seo";
import { api } from "~/trpc/server";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { SEOEditor } from "./_components/seo-editor";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function SEOPage({ searchParams }: Props) {
  const business = await api.business.getWith({ includeSiteContent: true });
  if (!business) notFound();
  if (!business.siteContent) notFound();

  // `isEnabled` is a SIBLING of `flags`, not `flags.isEnabled`.
  const { isEnabled } = await getBusinessFlags();

  // Run inline rather than behind Suspense: on this page the scorecard *is* the
  // report, so there is nothing useful to paint without it. It is also
  // deliberately uncached — an owner who saves a meta description below should
  // see the number move on the very next render.
  const scorecard = await computeSeoScorecard({
    businessId: business.id,
    isEnabled,
    business,
    siteContent: business.siteContent,
  });

  // Deep links from elsewhere in the admin (`seoEditorHref`) land on a specific
  // tab; anything else — including a bare visit — opens on the score summary.
  // After mount the tab is purely local state, so this is a starting position,
  // not a synced value.
  const initialTab = parseSeoEditorTab((await searchParams).tab) ?? "score";

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Site Setup", href: "/admin/content" },
          { label: "SEO & Meta" },
        ]}
      />
      <HubSubNav hub="content" />

      <SEOEditor
        business={{
          id: business.id,
          name: business.name,
          subdomain: business.subdomain,
          customDomain: business.customDomain,
          domainStatus: business.domainStatus,
          localBusinessEnabled: business.localBusinessEnabled,
          allowAiCrawlers: business.allowAiCrawlers,
        }}
        siteContent={business.siteContent}
        // Handed over as plain data, not as a rendered element. The scorecard
        // now lives inside the editor's own `<form>`, on its first tab, and its
        // "Fix" rows have to be able to switch tabs — which only the client
        // component can do. `SeoScorecard` (JSON: groups of `ChecklistItem`s)
        // serializes across the boundary unchanged.
        scorecard={scorecard}
        initialTab={initialTab}
        // Resolved here rather than in the editor: `isEnabled` is a function
        // and cannot cross into a client component, so the gate is flattened
        // to the list of route keys that survive it.
        enabledRouteKeys={STATIC_SEO_ROUTES.filter(
          (route) => route.featureKey === null || isEnabled(route.featureKey),
        ).map((route) => route.key)}
      />
    </>
  );
}

export const metadata = {
  title: "SEO & Meta Settings",
};
