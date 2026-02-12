/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/content/_components/content-dashboard.tsx
"use client";

import Link from "next/link";
import {
  Edit,
  Eye,
  FileText,
  Globe,
  Home,
  Menu,
  Plus,
  Search,
  Shield,
} from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

type ContentDashboardProps = {
  business: {
    id: string;
    name: string;
    siteContent: any | null;
    pages: Array<{
      id: string;
      title: string;
      slug: string;
      type: string;
      published: boolean;
      updatedAt: Date;
    }>;
  };
};

export function ContentDashboard({ business }: ContentDashboardProps) {
  const regularPages = business.pages.filter((p) => p.type === "page");
  const policyPages = business.pages.filter((p) => p.type === "policy");
  const publishedPages = business.pages.filter((p) => p.published);

  return (
    <>
      <>
        {/* Header
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Site Content</h1>
          <p className="mt-2 text-gray-600">
            Manage your website content, pages, and navigation
          </p>
        </div> */}

        {/* Main Content Sections */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Homepage */}
          <Link href="/admin/content/homepage">
            <Card className="h-full cursor-pointer transition-all hover:border-blue-500 hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-3">
                    <Home className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Homepage</CardTitle>
                    <CardDescription>Hero, about, features</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Edit your homepage content and layout
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Pages */}
          <Link href="/admin/content/pages">
            <Card className="h-full cursor-pointer transition-all hover:border-green-500 hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-green-100 p-3">
                      <FileText className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <CardTitle>Pages</CardTitle>
                      <CardDescription>
                        {regularPages.length} pages
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-gray-600">
                  About, Contact, FAQ, and custom pages
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Page
                </Button>
              </CardContent>
            </Card>
          </Link>

          {/* Policies */}
          <Link href="/admin/content/policies">
            <Card className="h-full cursor-pointer transition-all hover:border-purple-500 hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-100 p-3">
                    <Shield className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>Policies</CardTitle>
                    <CardDescription>
                      {policyPages.length} policies
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-gray-600">
                  Privacy, Terms, Refunds, Shipping
                </p>
                {policyPages.length === 0 && (
                  <Badge variant="secondary" className="text-xs">
                    Templates available
                  </Badge>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Navigation */}
          <Link href="/admin/content/navigation">
            <Card className="h-full cursor-pointer transition-all hover:border-orange-500 hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-orange-100 p-3">
                    <Menu className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle>Navigation</CardTitle>
                    <CardDescription>Menu structure</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Configure your site menu and links
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* SEO & Meta */}
          <Link href="/admin/content/seo">
            <Card className="h-full cursor-pointer transition-all hover:border-pink-500 hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-pink-100 p-3">
                    <Search className="h-6 w-6 text-pink-600" />
                  </div>
                  <div>
                    <CardTitle>SEO & Meta</CardTitle>
                    <CardDescription>Search optimization</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Meta tags, favicons, social media
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Template Fields */}
          <Link href="/admin/content/template">
            <Card className="h-full cursor-pointer transition-all hover:border-indigo-500 hover:shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-indigo-100 p-3">
                    <Globe className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle>Template Fields</CardTitle>
                    <CardDescription>Custom content</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Template-specific custom fields
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Pages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{business.pages.length}</p>
              <p className="mt-1 text-xs text-gray-500">
                All pages and policies
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Published
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {publishedPages.length}
              </p>
              <p className="mt-1 text-xs text-gray-500">Live on your site</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Drafts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-amber-600">
                {business.pages.length - publishedPages.length}
              </p>
              <p className="mt-1 text-xs text-gray-500">Not yet published</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Pages */}
        {business.pages.length > 0 && (
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
                {business.pages.slice(0, 5).map((page) => (
                  <div
                    key={page.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100"
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
                      <p className="text-xs text-gray-500">/{page.slug}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        Updated {new Date(page.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/content/pages/${page.id}/edit`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      {page.published && (
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={`/${page.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
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
        {business.pages.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900">
                  No pages yet
                </h3>
                <p className="mb-6 text-gray-600">
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
    </>
  );
}
