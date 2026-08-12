"use client";

import Link from "next/link";
import { Edit, Eye, FileText, Plus } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { getHubCards } from "~/app/admin/_lib/admin-nav";
import { useFeatureFlags } from "~/hooks/use-feature-flags";

type Props = {
  pages: Array<{
    id: string;
    title: string;
    slug: string;
    type: string;
    published: boolean;
    updatedAt: Date;
  }>;
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
  pages,
  isPlatformAdmin = false,
  flags,
}: Props) {
  const { isEnabled } = useFeatureFlags({ flags });
  const regularPages = pages.filter((p) => p.type === "page");
  const policyPages = pages.filter((p) => p.type === "policy");
  const blogPages = pages.filter((p) => p.type === "blog");
  const publishedPages = pages.filter((p) => p.published);

  // Dynamic descriptions for cards that show counts
  const dynamicDescriptions: Record<string, string> = {
    "content-pages": `${regularPages.length} pages`,
    "content-blog": `${blogPages.length} blog posts`,
    "content-policies": `${policyPages.length} policies`,
  };

  const contentCards = getHubCards("content", {
    includePlatformOnly: isPlatformAdmin,
  }).filter((card) => !card.featureKey || isEnabled(card.featureKey));

  return (
    <>
      {/* Explainer: three editing surfaces at a glance */}
      <div className="mb-6 rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Site Editor</span>
        {" — click any section of your live site to edit its text, images, and visibility. "}
        <span className="font-medium text-foreground">Pages</span>
        {" — create standalone CMS pages (About, Contact). "}
        <span className="font-medium text-foreground">Brand Identity</span>
        {" — upload a logo and choose your template."}
      </div>

      {/* Main Content Sections */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {contentCards.map((card) => {
          const bg = bgMap[card.color] ?? "bg-slate-100";
          const text = textMap[card.color] ?? "text-slate-600";
          const border = borderMap[card.color] ?? "hover:border-slate-500";
          const Icon = card.icon;
          const description = dynamicDescriptions[card.key] ?? card.description;

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
                      <CardDescription>{description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-3 text-sm">
                    {card.body}
                  </p>
                  {card.key === "content-policies" &&
                    policyPages.length === 0 && (
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

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pages.length}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              All pages and policies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Published
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {publishedPages.length}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Live on your site
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Drafts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">
              {pages.length - publishedPages.length}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Not yet published
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Pages */}
      {pages.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Pages</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/content/pages">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pages.slice(0, 5).map((page) => (
                <div
                  key={page.id}
                  className="bg-muted hover:bg-muted/70 flex items-center justify-between rounded-lg p-3 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {page.title}
                      </p>
                      {!page.published && (
                        <Badge variant="secondary" className="text-xs">
                          Draft
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs capitalize">
                        {page.type}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      /{page.slug}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Updated {new Date(page.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/content/pages/${page.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    {page.published && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/${page.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {pages.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <h3 className="text-foreground mb-2 text-lg font-medium">
                No pages yet
              </h3>
              <p className="text-muted-foreground mb-2">
                Get started by creating your first page or policy
              </p>
              <p className="text-muted-foreground mb-6 text-xs">
                To edit homepage sections or hero content, use the{" "}
                <Link
                  href="/editor"
                  className="text-primary underline underline-offset-2"
                >
                  Site Editor
                </Link>{" "}
                instead.
              </p>
              <div className="flex justify-center gap-3">
                <Button asChild>
                  <Link href="/admin/content/pages/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Page
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/admin/content/policies">Set Up Policies</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
