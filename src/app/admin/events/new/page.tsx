import { api } from "~/trpc/server";

import { EventForm } from "../_components/event-form";
import { TrailHeader } from "../../_components/trail-header";

export default async function NewEventPage() {
  const business = await api.business.getWith({ includeSiteContent: false });

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Events", href: "/admin/events" },
          { label: "New Event" },
        ]}
      />
      <EventForm timeZone={business.timeZone} />
    </>
  );
}

export const metadata = {
  title: "New Event",
};
