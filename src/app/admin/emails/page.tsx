import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import { EmailPreview } from "./_components/email-preview";

export default async function EmailPreviewPage() {
  const { business, sampleOrder } = await api.business.getForEmailPreview();

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Email Previews" }]} />
      <EmailPreview business={business} sampleOrder={sampleOrder} />
    </>
  );
}

export const metadata = {
  title: "Email Previews",
};
