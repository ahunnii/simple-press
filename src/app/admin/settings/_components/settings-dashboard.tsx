"use client";

import Link from "next/link";

import { useFeatureFlags } from "~/hooks/use-feature-flags";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { getHubCards, isHubCardEnabled } from "~/app/admin/_lib/admin-nav";

const settingsCards = getHubCards("settings");

// Tailwind color maps — must be static strings so the compiler includes them
const bgMap: Record<string, string> = {
  slate: "bg-slate-100",
  emerald: "bg-emerald-100",
  cyan: "bg-cyan-100",
  yellow: "bg-yellow-100",
  orange: "bg-orange-100",
  indigo: "bg-indigo-100",
  purple: "bg-purple-100",
  red: "bg-red-100",
  blue: "bg-blue-100",
  violet: "bg-violet-100",
};

const textMap: Record<string, string> = {
  slate: "text-slate-600",
  emerald: "text-emerald-600",
  cyan: "text-cyan-600",
  yellow: "text-yellow-600",
  orange: "text-orange-600",
  indigo: "text-indigo-600",
  purple: "text-purple-600",
  red: "text-red-600",
  blue: "text-blue-600",
  violet: "text-violet-600",
};

const borderMap: Record<string, string> = {
  slate: "hover:border-slate-500",
  emerald: "hover:border-emerald-500",
  cyan: "hover:border-cyan-500",
  yellow: "hover:border-yellow-500",
  orange: "hover:border-orange-500",
  indigo: "hover:border-indigo-500",
  purple: "hover:border-purple-500",
  red: "hover:border-red-500",
  blue: "hover:border-blue-500",
  violet: "hover:border-violet-500",
};

export function SettingsDashboard({
  flags,
}: {
  flags: Record<string, boolean>;
}) {
  const { isEnabled } = useFeatureFlags({ flags });
  const visibleCards = settingsCards.filter((card) =>
    isHubCardEnabled(card, isEnabled),
  );

  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map((card) => {
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
                  <p className="text-muted-foreground text-sm">{card.body}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </>
  );
}
