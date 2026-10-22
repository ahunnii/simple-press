import { redirect } from "next/navigation";

import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";

import { EmailStyleForm } from "../_components/email-style-form";
import { TrailHeader } from "../../_components/trail-header";

// Gated like the composer: while emailMarketing is off, send the owner back to
// history (the layout shows the notice there). Writes are also gated server-side.
export default async function EmailStylePage() {
  const flags = await getBusinessFlags();
  if (!flags.isEnabled("emailMarketing")) redirect("/admin/marketing");

  const initial = await api.marketing
    .getEmailStyle()
    .catch(rethrowTrpcForErrorBoundary);

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Email Marketing", href: "/admin/marketing" },
          { label: "Email style" },
        ]}
      />
      <EmailStyleForm initial={initial} />
    </>
  );
}

export const metadata = {
  title: "Email style",
};
