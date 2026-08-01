import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { GenericFeatureDisabledPage } from "~/components/shared/generic-feature-disabled-page";

import { TrailHeader } from "../_components/trail-header";
import { EventsClient } from "./_components/events-client";

export default async function AdminEventsPage() {
  const flags = await getBusinessFlags();
  if (!flags.isEnabled("events")) {
    return <GenericFeatureDisabledPage featureName="Events" />;
  }

  const [events, business] = await Promise.all([
    api.events.getAll().catch(rethrowTrpcForErrorBoundary),
    api.business.getWith({ includeSiteContent: false }),
  ]);

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Events" }]} />
      <EventsClient events={events ?? []} timeZone={business.timeZone} />
    </>
  );
}

export const metadata = {
  title: "Events",
};
