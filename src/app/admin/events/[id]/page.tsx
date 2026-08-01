import { notFound } from "next/navigation";

import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { EventForm } from "../_components/event-form";
import { TrailHeader } from "../../_components/trail-header";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditEventPage({ params }: PageProps) {
  const { id } = await params;

  const [event, business] = await Promise.all([
    api.events.getById(id).catch(rethrowTrpcForErrorBoundary),
    api.business.getWith({ includeSiteContent: false }),
  ]);

  if (!event) notFound();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Events", href: "/admin/events" },
          { label: event.name },
        ]}
      />
      <EventForm event={event} timeZone={business.timeZone} />
    </>
  );
}

export const generateMetadata = async ({ params }: PageProps) => {
  const { id } = await params;
  const event = await api.events.getById(id).catch(rethrowTrpcForErrorBoundary);
  if (!event) notFound();
  return {
    title: `Edit ${event.name}`,
  };
};
