import { notFound } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { buildPageMetadata, loadSeoBusiness } from "~/lib/seo";
import { buildEventSchema, buildItemListSchema } from "~/lib/structured-data";
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

  // Each event now has its own detail page at /events/[slug], so — like the
  // blog and services index pages — an ItemList genuinely describes a set of
  // navigable things here. Emit it alongside the per-event Event entities,
  // skipping the whole blob when there's nothing to list.
  const jsonLd =
    events.length > 0
      ? [
          buildItemListSchema(
            business,
            events.map((event) => ({
              name: event.name,
              path: `/events/${event.slug}`,
              image: event.coverImage,
            })),
          ),
          ...events.map((event) =>
            buildEventSchema(event, business, business.timeZone),
          ),
        ]
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
