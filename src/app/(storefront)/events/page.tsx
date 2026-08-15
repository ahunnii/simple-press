import { notFound } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { buildPageMetadata, loadSeoBusiness } from "~/lib/seo";
import { buildEventSchema } from "~/lib/structured-data";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { JsonLd } from "~/components/json-ld";

import { getTemplate } from "../_templates/registry";

export default async function EventsPage() {
  const { isEnabled } = await getBusinessFlags();
  if (!isEnabled("events")) notFound();

  const business = await api.business
    .simplifiedGet()
    .catch(rethrowTrpcForErrorBoundary);
  if (!business) notFound();

  // The route already gates on the "events" flag above, but
  // getUpcomingPublic's own featureGate throws FORBIDDEN when the flag is
  // off — this catch just keeps the fetch from ever bubbling a raw tRPC
  // error into the page, matching the services/homepage pattern.
  const events = await api.events.getUpcomingPublic().catch(() => []);

  const t = getTemplate(business.templateId);
  // EventsPage is optional in TemplateComponentSet (some templates may never
  // implement it), but defaultEntry always provides one, so this only
  // guards TypeScript's optional-slot typing — it should never 404 in
  // practice while the "events" flag is on.
  if (!t.EventsPage) notFound();

  // Event entities only — deliberately no ItemList, unlike the blog and
  // services index pages. Those list items each have their own detail URL, so
  // the ItemList genuinely describes a set of navigable things. Events have no
  // detail page, so every entry would carry this same /events path: a list that
  // says "here are five items" and points all five at itself adds no
  // navigational information and just duplicates the Event markup below it.
  // Skip the blob entirely when there's nothing to describe.
  const jsonLd =
    events.length > 0
      ? events.map((event) =>
          buildEventSchema(event, business, business.timeZone),
        )
      : null;

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      <t.EventsPage
        business={business}
        events={events}
        timeZone={business.timeZone}
      />
    </>
  );
}

export async function generateMetadata() {
  const business = await loadSeoBusiness("/events");
  return buildPageMetadata({
    business,
    path: "/events",
    pageMetaKey: "events",
    title: "Events",
  });
}
