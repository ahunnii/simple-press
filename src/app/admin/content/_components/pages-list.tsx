"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Eye,
  MoreVertical,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

type PagesListProps = {
  business: {
    id: string;
    name: string;
    subdomain: string;
    customDomain: string | null;
    pages: Array<{
      id: string;
      title: string;
      slug: string;
      published: boolean;
      updatedAt: Date;
    }>;
  };
};

export function PagesList({ business }: PagesListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const deletePage = api.content.deletePage.useMutation({
    onSuccess: () => {
      toast.success("Page deleted");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete page");
    },
  });

  const filteredPages = business.pages.filter(
    (page) =>
      page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      page.slug.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Delete "${title}"? This cannot be undone.`)) {
      deletePage.mutate({ id });
    }
  };

  const storefrontUrl = business.customDomain
    ? `https://${business.customDomain}`
    : `https://${business.subdomain}.myapplication.com`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/content">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Pages</h1>
              <p className="mt-2 text-gray-600">Manage your static pages</p>
            </div>
            <Button asChild>
              <Link href="/admin/content/pages/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Page
              </Link>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pages..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Pages Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Pages ({filteredPages.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPages.length === 0 ? (
              <div className="py-12 text-center">
                <p className="mb-4 text-gray-500">
                  {searchQuery ? "No pages found" : "No pages yet"}
                </p>
                {!searchQuery && (
                  <Button asChild>
                    <Link href="/admin/content/pages/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Page
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPages.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell className="font-medium">
                        {page.title}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        /{page.slug}
                      </TableCell>
                      <TableCell>
                        {page.published ? (
                          <Badge variant="default" className="bg-green-600">
                            Published
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {new Date(page.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link
                                href={`/admin/content/pages/${page.id}/edit`}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            {page.published && (
                              <DropdownMenuItem asChild>
                                <a
                                  href={`${storefrontUrl}/${page.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Live
                                </a>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDelete(page.id, page.title)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
