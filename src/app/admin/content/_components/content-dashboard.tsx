"use client";

import Link from "next/link";

import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { getHubCards, isHubCardEnabled } from "~/app/admin/_lib/admin-nav";

type Props = {
  /** Count of policy pages (`Page.type === "policy"`) — drives the
   * "Templates available" badge on the Policies card below. */
  policyCount: number;
  /**
   * When true, includes cards flagged `platformOnly` for this hub (e.g. the
   * legacy Template Fields editor). Hidden from owners/managers.
   */
  isPlatformAdmin?: boolean;
  flags: Record<string, boolean>;
};

// Tailwind color maps — must be static strings so the compiler includes them
const bgMap: Record<string, string> = {
  blue: "bg-blue-100",
  green: "bg-green-100",
  purple: "bg-purple-100",
  orange: "bg-orange-100",
  pink: "bg-pink-100",
  indigo: "bg-indigo-100",
  teal: "bg-teal-100",
  amber: "bg-amber-100",
  rose: "bg-rose-100",
  slate: "bg-slate-100",
};

const textMap: Record<string, string> = {
  blue: "text-blue-600",
  green: "text-green-600",
  purple: "text-purple-600",
  orange: "text-orange-600",
  pink: "text-pink-600",
  indigo: "text-indigo-600",
  teal: "text-teal-600",
  amber: "text-amber-600",
  rose: "text-rose-600",
  slate: "text-slate-600",
};

const borderMap: Record<string, string> = {
  blue: "hover:border-blue-500",
  green: "hover:border-green-500",
  purple: "hover:border-purple-500",
  orange: "hover:border-orange-500",
  pink: "hover:border-pink-500",
  indigo: "hover:border-indigo-500",
  teal: "hover:border-teal-500",
  amber: "hover:border-amber-500",
  rose: "hover:border-rose-500",
  slate: "hover:border-slate-500",
};

export function ContentDashboard({
  policyCount,
  isPlatformAdmin = false,
  flags,
}: Props) {
  const { isEnabled } = useFeatureFlags({ flags });

  const contentCards = getHubCards("content", {
    includePlatformOnly: isPlatformAdmin,
  }).filter((card) => isHubCardEnabled(card, isEnabled));

  return (
    <>
      {/* Explainer: this hub is one-off configuration, not day-to-day authoring. */}
      <div className="bg-muted/50 text-muted-foreground mb-6 rounded-lg border px-4 py-3 text-sm">
        Store-wide setup you configure once and rarely revisit — brand,
        navigation, search listing, and policies. For day-to-day content, use{" "}
        <span className="text-foreground font-medium">Site Editor</span>
        {" or "}
        <span className="text-foreground font-medium">Pages</span>
        {" in the sidebar."}
      </div>

      {/* Main Content Sections */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {contentCards.map((card) => {
          const bg = bgMap[card.color] ?? "bg-slate-100";
          const text = textMap[card.color] ?? "text-slate-600";
          const border = borderMap[card.color] ?? "hover:border-slate-500";
          const Icon = card.icon;

          return (
            <Link key={card.key} href={card.href}>
              <Card
                className={`h-full cursor-pointer transition-all hover:shadow-lg ${border}`}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-3 ${bg}`}>
                      <Icon className={`h-6 w-6 ${text}`} />
                    </div>
                    <div>
                      <CardTitle>{card.title}</CardTitle>
                      <CardDescription>{card.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3 text-sm">
                    {card.body}
                  </p>
                  {card.key === "content-policies" && policyCount === 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Templates available
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
