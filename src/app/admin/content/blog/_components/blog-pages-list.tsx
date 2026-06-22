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

import { env } from "~/env";
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

type Props = {
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
      type: string;
    }>;
  };
};

export function BlogPagesList({ business }: Props) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const deletePage = api.content.deletePage.useMutation({
    onSuccess: () => {
      toast.success("Blog post deleted");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete blog post");
    },
  });

  const filteredPages = business.pages.filter(
    (page) =>
      (page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        page.slug.toLowerCase().includes(searchQuery.toLowerCase())) &&
      page.type === "blog",
  );

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Delete "${title}"? This cannot be undone.`)) {
      deletePage.mutate({ id });
    }
  };

  const storefrontUrl =
    process.env.NODE_ENV === "development"
      ? `https://${business.subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`
      : business.customDomain
        ? `https://${business.customDomain}`
        : `https://${business.subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`;

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="admin-form-toolbar">
        <div className="toolbar-info">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/admin/content">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <h1 className="text-base font-medium">Blog Posts</h1>
          </div>
        </div>

        <div className="toolbar-actions">
          <Button asChild>
            <Link href="/admin/content/blog/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Blog Post
            </Link>
          </Button>
        </div>
      </div>

      <div className="admin-container">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search blog posts..."
              aria-label="Search posts"
              className="pl-10"
            />
          </div>
        </div>

        {/* Pages Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Blog Posts ({filteredPages.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPages.length === 0 ? (
              <div className="py-12 text-center">
                <p className="mb-4 text-muted-foreground">
                  {searchQuery ? "No pages found" : "No pages yet"}
                </p>
                {!searchQuery && (
                  <Button asChild>
                    <Link href="/admin/content/blog/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Blog Post
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
                        <Link
                          href={`/admin/content/blog/${page.id}`}
                          className="relative cursor-pointer transition-colors after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-200 hover:after:scale-x-100"
                          style={{
                            textUnderlineOffset: 4,
                            textDecoration: "none",
                          }}
                        >
                          {page.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
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
                      <TableCell className="text-muted-foreground">
                        {new Date(page.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Actions for {page.title}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/content/pages/${page.id}`}>
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
                              className="text-destructive"
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
