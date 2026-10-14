import { Info } from "lucide-react";

import { requireAdminAccess } from "~/lib/require-admin-access";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { StoreTransferClient } from "~/components/store-transfer/store-transfer-client";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { SiteExportClient } from "./_components/site-export-client";

const INCLUDED = [
  "Every page, blog post and policy, as readable documents",
  "Your products, with their photos and variants, as spreadsheets",
  "All of your photos and files, organized into folders",
  "Customer, order, discount and review records",
  "Step-by-step guides for moving to WordPress, Shopify, Wix, Squarespace or Square",
  "A complete backup of your site data, for safekeeping",
];

export default async function DataSettingsPage() {
  const { session, membershipRole } = await requireAdminAccess();

  // `membershipRole` is null for PLATFORM_ADMIN — they have no
  // BusinessMembership row, so `requireAdminAccess` skips the membership
  // lookup for them. Treat that null as full access rather than "not an
  // owner" — mirrors the `canManage` logic in settings/team/page.tsx.
  const isPlatformAdmin = session.user.platformRole === "PLATFORM_ADMIN";
  const canDownloadSite = isPlatformAdmin || membershipRole === "OWNER";

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Data & Export" },
        ]}
      />
      <HubSubNav hub="settings" />

      <div className="admin-container space-y-10">
        <div className="admin-header">
          <div>
            <h1>Data &amp; Export</h1>
            <p>Your content is yours — download it any time</p>
          </div>
        </div>

        {/* ── Download your site ───────────────────────────────────────── */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Download your site</h2>
            <p className="text-muted-foreground text-sm">
              Everything on your site — pages, blog posts, products, photos,
              customer and order records — in one organized folder, with
              step-by-step guides for moving to WordPress, Shopify, Wix,
              Squarespace or Square. Your content is yours; download it any
              time.
            </p>
          </div>

          {canDownloadSite ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">What&apos;s included</h3>
                <ul className="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-sm">
                  {INCLUDED.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <SiteExportClient />
            </div>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Downloading your site is Owner-only</AlertTitle>
              <AlertDescription>
                Only the store owner can download a full copy of the
                store&apos;s content, products, and customer records.
              </AlertDescription>
            </Alert>
          )}
        </section>

        {/* ── Store Transfer (platform admin only) ─────────────────────── */}
        {isPlatformAdmin && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Store Transfer</h2>
              <p className="text-muted-foreground text-sm">
                Platform admin only — export a store to a SimplePress ZIP
                archive, or import one into this store
              </p>
            </div>

            <StoreTransferClient isPlatformAdmin={isPlatformAdmin} />
          </section>
        )}
      </div>
    </>
  );
}

export const metadata = {
  title: "Data & Export",
};
