import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import { EmailPreview } from "./_components/email-preview";

export default async function EmailPreviewPage() {
  const [{ business, sampleOrder }, emailOverrides] = await Promise.all([
    api.business.getForEmailPreview(),
    api.business.getEmailOverrides(),
  ]);

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Notification Emails" }]} />
      <EmailPreview
        business={business}
        sampleOrder={sampleOrder}
        savedOverrides={emailOverrides}
      />
    </>
  );
}

export const metadata = {
  title: "Notification Emails",
};
