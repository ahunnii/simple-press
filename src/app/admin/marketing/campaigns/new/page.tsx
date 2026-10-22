import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  FileText,
  Newspaper,
  Percent,
  ShoppingBag,
} from "lucide-react";

import type { CampaignStarterId } from "~/lib/marketing/starters";
import { getBusinessFlags } from "~/lib/features/get-business-flags";
import { getBusinessPostalAddress } from "~/lib/marketing/render-campaign";
import {
  availableStarters,
  getCampaignStarter,
} from "~/lib/marketing/starters";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { Card } from "~/components/ui/card";

import { BroadcastComposer } from "../../_components/broadcast-composer";
import { TrailHeader } from "../../../_components/trail-header";

type Props = {
  searchParams: Promise<{ starter?: string | string[] }>;
};

const STARTER_ICONS: Record<CampaignStarterId, LucideIcon> = {
  blank: FileText,
  sale: Percent,
  "new-arrival": ShoppingBag,
  event: CalendarDays,
  newsletter: Newspaper,
};

// The composer stays gated while emailMarketing is off: send the owner back to
// history (the layout shows the notice there). Writes are also gated server-side.
//
// With no `?starter=` the owner picks a layout first; any `?starter=` (an
// unknown id included) opens the composer, seeded when the id is known.
// Nothing is saved until they press Save draft.
export default async function NewCampaignPage({ searchParams }: Props) {
  const flags = await getBusinessFlags();
  if (!flags.isEnabled("emailMarketing")) redirect("/admin/marketing");

  const { starter: starterParam } = await searchParams;
  const starterId = Array.isArray(starterParam)
    ? starterParam[0]
    : starterParam;
  const productsEnabled = flags.isEnabled("products");

  if (starterId === undefined) {
    const starters = availableStarters({ productsEnabled });
    return (
      <>
        <TrailHeader
          breadcrumbs={[
            { label: "Email Marketing", href: "/admin/marketing" },
            { label: "New campaign" },
          ]}
        />
        <div className="admin-container space-y-6">
          <div className="admin-header">
            <div>
              <h1>New campaign</h1>
              <p>
                Pick a starting point. Everything is editable, and nothing is
                saved until you save the draft.
              </p>
            </div>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {starters.map((starter) => {
              const Icon = STARTER_ICONS[starter.id];
              return (
                <li key={starter.id}>
                  <Link
                    href={`/admin/marketing/campaigns/new?starter=${starter.id}`}
                    className="focus-visible:ring-ring group block h-full rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <Card className="group-hover:border-primary/50 h-full gap-3 p-5 transition-colors">
                      <span
                        aria-hidden="true"
                        className="bg-muted text-muted-foreground group-hover:text-foreground flex h-10 w-10 items-center justify-center rounded-lg"
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <h2 className="text-base font-medium">
                          {starter.id === "blank"
                            ? "Start from scratch"
                            : starter.name}
                        </h2>
                        <p className="text-muted-foreground mt-1 text-sm">
                          {starter.description}
                        </p>
                      </div>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </>
    );
  }

  const [audience, business] = await Promise.all([
    api.marketing.listRecipients().catch(rethrowTrpcForErrorBoundary),
    api.business.simplifiedGet(),
  ]);

  // Unknown ids, and starters that need products while they're off, open blank.
  const known = getCampaignStarter(starterId);
  const starter =
    known && known.id !== "blank" && (productsEnabled || !known.needsProducts)
      ? known
      : undefined;

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Email Marketing", href: "/admin/marketing" },
          { label: "New campaign" },
        ]}
      />
      <BroadcastComposer
        // A different starter is a different form: remount, don't patch.
        key={starter?.id ?? "blank"}
        starter={
          starter && {
            subject: starter.subject,
            previewText: starter.previewText,
            doc: starter.doc,
          }
        }
        recipientCount={audience.count}
        timeZone={business?.timeZone ?? "UTC"}
        mediaEnabled={flags.isEnabled("media")}
        productsEnabled={productsEnabled}
        baseUrl={audience.baseUrl}
        hasPostalAddress={
          business !== null && getBusinessPostalAddress(business) !== null
        }
      />
    </>
  );
}

export const metadata = {
  title: "New campaign",
};
