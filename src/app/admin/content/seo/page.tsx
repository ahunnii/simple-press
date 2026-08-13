import { notFound } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { computeSeoScorecard } from "~/lib/seo/scorecard";
import { STATIC_SEO_ROUTES } from "~/lib/validators/site-seo";
import { api } from "~/trpc/server";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { SEOEditor } from "./_components/seo-editor";
import { SeoScorecard } from "./_components/seo-scorecard";

export default async function SEOPage() {
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
        // Handed over as an already-rendered element rather than composed here.
        // The scorecard belongs BELOW the sticky toolbar (which `SEOEditor`
        // owns) but OUTSIDE the `<form>` — its accordion triggers are untyped
        // `<button>`s and would submit the SEO form from inside it. Passing a
        // server component as a prop to a client component is fine in Next: it
        // renders on the server and arrives as an already-serialized tree.
        scorecard={<SeoScorecard scorecard={scorecard} />}
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
