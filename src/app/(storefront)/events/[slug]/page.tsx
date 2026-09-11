import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCanonicalUrl } from "~/lib/canonical";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { eventCutoff } from "~/lib/events/format";
import { loadSeoBusiness } from "~/lib/seo";
import {
  buildBreadcrumbSchema,
  buildEventSchema,
} from "~/lib/structured-data";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { JsonLd } from "~/components/json-ld";

import { getTemplate } from "../../_templates/registry";

type Props = {
  params: Promise<{ slug: string }>;
};

// generateMetadata and the page component both need the same event — wrap
// the fetch in React's request-scoped cache() so the tRPC call (and its DB
// round trip) only runs once per request instead of twice. `api.*` calls
// from src/trpc/server.ts are plain promises, not query-client-backed, so
// they don't dedupe on their own (unlike `.prefetch()`).
const getCachedEvent = cache((slug: string) => api.events.getBySlug(slug));

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;

  const { isEnabled } = await getBusinessFlags();
  if (!isEnabled("events")) notFound();

  const business = await api.business
    .simplifiedGet()
    .catch(rethrowTrpcForErrorBoundary);
  if (!business) notFound();

  const event = await getCachedEvent(slug).catch(rethrowTrpcForErrorBoundary);
  if (!event) notFound();

  const isPast = eventCutoff(event).getTime() < Date.now();

  const t = getTemplate(business.templateId);
  // EventPage is optional in TemplateComponentSet (some templates may never
  // implement it), but defaultEntry always provides one, so this only
  // guards TypeScript's optional-slot typing — it should never 404 in
  // practice while the "events" flag is on.
  if (!t.EventPage) notFound();

  const eventSchema = buildEventSchema(event, business, business.timeZone);
  const breadcrumbSchema = buildBreadcrumbSchema(business, [
    { name: "Home", path: "/" },
    { name: "Events", path: "/events" },
    { name: event.name, path: `/events/${event.slug}` },
  ]);

  return (
    <>
      <JsonLd data={[eventSchema, breadcrumbSchema]} />
      <t.EventPage
        business={business}
        event={event}
        timeZone={business.timeZone}
        isPast={isPast}
      />
    </>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  // Static route label, not the interpolated slug — keeps the throttle key
  // and Sentry `route` tag low-cardinality (one bucket for every event).
  const [event, business] = await Promise.all([
    getCachedEvent(slug).catch(() => null),
    loadSeoBusiness("/events/[slug]"),
  ]);

  if (!event) return { title: "Event Not Found" };

  const title = event.name;
  const description = event.blurb ?? undefined;

  const ogImage =
    event.coverImage ??
    business?.siteContent?.ogImage ??
    business?.siteContent?.logoUrl ??
    "/placeholder.svg";

  return {
    title,
    description,
    ...(business && {
      alternates: {
        canonical: getCanonicalUrl(business, `/events/${slug}`),
      },
    }),
    openGraph: {
      title,
      description,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}
