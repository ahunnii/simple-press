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

type Props = {
  pages: Array<{
    id: string;
    title: string;
    slug: string;
    type: string;
    published: boolean;
    updatedAt: Date;
  }>;
};

// Tailwind color maps — must be static strings so the compiler includes them
const bgMap: Record<string, string> = {
  blue: "bg-blue-100",
  green: "bg-green-100",
  purple: "bg-purple-100",
  orange: "bg-orange-100",
  pink: "bg-pink-100",
  indigo: "bg-indigo-100",
};

const textMap: Record<string, string> = {
  blue: "text-blue-600",
  green: "text-green-600",
  purple: "text-purple-600",
  orange: "text-orange-600",
  pink: "text-pink-600",
  indigo: "text-indigo-600",
};

const borderMap: Record<string, string> = {
  blue: "hover:border-blue-500",
  green: "hover:border-green-500",
  purple: "hover:border-purple-500",
  orange: "hover:border-orange-500",
  pink: "hover:border-pink-500",
  indigo: "hover:border-indigo-500",
};

export function ContentDashboard({ pages }: Props) {
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

  const contentCards = getHubCards("content");

  return (
    <>
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
                  <p className="mb-3 text-sm text-muted-foreground">{card.body}</p>
                  {card.key === "content-policies" && policyPages.length === 0 && (
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
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pages.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">All pages and policies</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Published
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {publishedPages.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Live on your site</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Drafts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">
              {pages.length - publishedPages.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Not yet published</p>
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
                  className="flex items-center justify-between rounded-lg bg-muted p-3 transition-colors hover:bg-muted/70"
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
                    <p className="text-xs text-muted-foreground">/{page.slug}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
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
              <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium text-foreground">
                No pages yet
              </h3>
              <p className="mb-6 text-muted-foreground">
                Get started by creating your first page or policy
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
