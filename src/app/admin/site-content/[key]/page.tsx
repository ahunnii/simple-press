import { notFound } from "next/navigation";

import { api } from "~/trpc/server";

import { SiteContentForm } from "../_components/site-content-form";
import { SiteHeader } from "../../_components/site-header";

type Props = {
  params: Promise<{ key: string }>;
};

export default async function AdminSiteContentKeyPage({ params }: Props) {
  const { key: keyParam } = await params;
  const decodedKey = decodeURIComponent(keyParam);
  const siteContent = await api.siteContent.getByKey(decodedKey);
  if (!siteContent) notFound();

  const defaultValues = {
    key: siteContent.key,
    value: siteContent.value,
  };

  return (
    <>
      <SiteHeader title={siteContent.key} />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 p-4 md:gap-6 md:py-6">
            <SiteContentForm
              keyParam={decodedKey}
              defaultValues={defaultValues}
            />
          </div>
        </div>
      </div>
    </>
  );
}
