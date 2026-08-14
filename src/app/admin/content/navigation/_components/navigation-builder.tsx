"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Info, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

type NavChild = {
  label: string;
  href: string;
  external?: boolean;
};

type NavItem = {
  label: string;
  href: string;
  external?: boolean;
  children?: NavChild[];
};

type Props = {
  business: {
    id: string;
    pages: Array<{ title: string; slug: string }>;
  };
  siteContent: {
    navigationItems: NavItem[];
  };
  servicesEnabled?: boolean;
  services?: Array<{ name: string; slug: string }>;
  /** Gates the Quick Add "Blog" shortcut. */
  blogEnabled?: boolean;
  /** Gates the Quick Add "Shop" shortcut. */
  productsEnabled?: boolean;
  /** Gates the Quick Add "Collections" shortcut. */
  collectionsEnabled?: boolean;
};

export function NavigationBuilder({
  business,
  siteContent,
  servicesEnabled,
  services,
  blogEnabled,
  productsEnabled,
  collectionsEnabled,
}: Props) {
  const router = useRouter();

  const [navItems, setNavItems] = useState<NavItem[]>(
    siteContent.navigationItems ?? [
      { label: "Home", href: "/" },
      { label: "Shop", href: "/shop" },
    ],
  );

  const updateSiteContent = api.content.updateSiteContent.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Navigation updated");
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message || "Failed to update navigation");
    },
    onMutate: () => {
      toast.loading("Updating navigation...");
    },
  });

  const isSaving = updateSiteContent.isPending;

  const handleSave = () => {
    updateSiteContent.mutate({
      navigationItems: navItems,
    });
  };

  const addNavItem = () => {
    setNavItems([...navItems, { label: "", href: "", external: false }]);
  };

  const updateNavItem = <K extends keyof NavItem>(
    index: number,
    field: K,
    value: NavItem[K],
  ) => {
    const updated = [...navItems];
    updated[index] = {
      ...updated[index]!,
      [field]: value,
    };
    setNavItems(updated);
  };

  const deleteNavItem = (index: number) => {
    setNavItems(navItems.filter((_, i) => i !== index));
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === navItems.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...navItems];
    [updated[index], updated[newIndex]] = [updated[newIndex]!, updated[index]!];
    setNavItems(updated);
  };

  const addChildItem = (parentIndex: number) => {
    const updated = [...navItems];
    const parent = { ...updated[parentIndex]! };
    parent.children = [...(parent.children ?? []), { label: "", href: "" }];
    updated[parentIndex] = parent;
    setNavItems(updated);
  };

  const updateChildItem = <K extends keyof NavChild>(
    parentIndex: number,
    childIndex: number,
    field: K,
    value: NavChild[K],
  ) => {
    const updated = [...navItems];
    const parent = { ...updated[parentIndex]! };
    const children = [...(parent.children ?? [])];
    children[childIndex] = { ...children[childIndex]!, [field]: value };
    parent.children = children;
    updated[parentIndex] = parent;
    setNavItems(updated);
  };

  const deleteChildItem = (parentIndex: number, childIndex: number) => {
    const updated = [...navItems];
    const parent = { ...updated[parentIndex]! };
    parent.children = (parent.children ?? []).filter(
      (_, i) => i !== childIndex,
    );
    updated[parentIndex] = parent;
    setNavItems(updated);
  };

  const quickAddPage = (slug: string, title: string) => {
    setNavItems([
      ...navItems,
      { label: title, href: `/${slug}`, external: false },
    ]);
    toast.success(`Added "${title}" to navigation`);
  };

  const addServicesMenu = () => {
    setNavItems([
      ...navItems,
      {
        label: "Services",
        href: "/services",
        external: false,
        children: (services ?? []).map((s) => ({
          label: s.name,
          href: `/services/${s.slug}`,
        })),
      },
    ]);
    toast.success("Added Services menu to navigation");
  };

  const initialNavItems = siteContent.navigationItems ?? [];
  const isSameOrder = navItems.every((item, i) => {
    const original = initialNavItems[i];
    const childrenMatch =
      (item.children?.length ?? 0) === (original?.children?.length ?? 0) &&
      (item.children ?? []).every((child, ci) => {
        const oc = original?.children?.[ci];
        return (
          child.label === oc?.label &&
          child.href === oc?.href &&
          child.external === oc?.external
        );
      });
    return (
      item.label === original?.label &&
      item.href === original.href &&
      item.external === original.external &&
      childrenMatch
    );
  });

  const isDirty = navItems.length !== initialNavItems.length || !isSameOrder;

  return (
    <div className="bg-muted/40 min-h-screen">
      <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
        <div className="toolbar-info">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/admin/content">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <h1 className="text-base font-medium">Edit Navigation</h1>

            <span
              className={`admin-status-badge ${
                isDirty ? "isDirty" : "isPublished"
              }`}
            >
              {isDirty ? "Unsaved Changes" : "Saved"}
            </span>
          </div>
        </div>

        <div className="toolbar-actions">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSaving || !isDirty}
            onClick={() => setNavItems(initialNavItems)}
            className="hidden md:inline-flex"
          >
            Reset
          </Button>

          <Button size="sm" disabled={isSaving} onClick={handleSave}>
            {isSaving ? (
              <>
                <span className="saving-indicator" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Save navigation</span>
                <span className="sm:hidden">Save</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="admin-container">
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>
            Custom items replace your template&apos;s menu
          </AlertTitle>
          <AlertDescription>
            Once you add an item here, it replaces your template&apos;s built-in
            navigation entirely — including the &quot;Nav Label&quot; fields in
            the Site Editor. On some templates, it also replaces the
            footer&apos;s link columns.
          </AlertDescription>
        </Alert>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Menu Items */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Menu Items</CardTitle>
                  <Button onClick={addNavItem} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {navItems.length === 0 ? (
                  <div className="text-muted-foreground py-8 text-center">
                    <p>
                      No menu items. Click &quot;Add Item&quot; to get started.
                    </p>
                  </div>
                ) : (
                  navItems.map((item, index) => (
                    <div key={index} className="rounded-md border p-3">
                      <div className="">
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col gap-2 pt-2">
                            <button
                              onClick={() => moveItem(index, "up")}
                              disabled={index === 0}
                              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                            >
                              ▲
                            </button>
                            <button
                              onClick={() => moveItem(index, "down")}
                              disabled={index === navItems.length - 1}
                              className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                            >
                              ▼
                            </button>
                          </div>

                          <div className="flex-1 space-y-3">
                            <div>
                              <Label>Label</Label>
                              <Input
                                value={item.label}
                                onChange={(e) =>
                                  updateNavItem(index, "label", e.target.value)
                                }
                                placeholder="Home"
                                className="mt-1"
                              />
                            </div>

                            <div>
                              <Label>URL</Label>
                              <Input
                                value={item.href}
                                onChange={(e) =>
                                  updateNavItem(index, "href", e.target.value)
                                }
                                placeholder="/products"
                                className="mt-1"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`external-${index}`}
                                checked={item.external ?? false}
                                onChange={(e) =>
                                  updateNavItem(
                                    index,
                                    "external",
                                    e.target.checked,
                                  )
                                }
                                className="rounded"
                                title="Open in new tab"
                              />
                              <Label
                                htmlFor={`external-${index}`}
                                className="text-sm"
                              >
                                Open in new tab
                              </Label>
                            </div>

                            {/* Sub-items */}
                            {(item.children?.length ?? 0) > 0 && (
                              <div className="border-t pt-3">
                                <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                                  Sub-items
                                </p>
                                <div className="space-y-3">
                                  {item.children!.map((child, ci) => (
                                    <div
                                      key={ci}
                                      className="border-border bg-muted flex items-start gap-3 rounded-md border p-3"
                                    >
                                      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                                        <div>
                                          <Label className="text-xs">
                                            Label
                                          </Label>
                                          <Input
                                            value={child.label}
                                            onChange={(e) =>
                                              updateChildItem(
                                                index,
                                                ci,
                                                "label",
                                                e.target.value,
                                              )
                                            }
                                            placeholder="Sub-page"
                                            className="mt-1 h-8 text-sm"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-xs">URL</Label>
                                          <Input
                                            value={child.href}
                                            onChange={(e) =>
                                              updateChildItem(
                                                index,
                                                ci,
                                                "href",
                                                e.target.value,
                                              )
                                            }
                                            placeholder="/sub-page"
                                            className="mt-1 h-8 text-sm"
                                          />
                                        </div>
                                      </div>
                                      <button
                                        onClick={() =>
                                          deleteChildItem(index, ci)
                                        }
                                        className="text-muted-foreground hover:text-destructive mt-5 transition-colors"
                                        title="Remove sub-item"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addChildItem(index)}
                              className="text-xs"
                            >
                              <ChevronDown className="mr-1.5 h-3 w-3" />
                              Add sub-item
                            </Button>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNavItem(index)}
                          >
                            <Trash2 className="text-destructive h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Add */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Add</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <h4 className="mb-2 text-sm font-medium">Common Pages</h4>
                  <div className="space-y-2">
                    {collectionsEnabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() =>
                          quickAddPage("collections", "Collections")
                        }
                      >
                        Collections
                      </Button>
                    )}
                    {productsEnabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => quickAddPage("shop", "Shop")}
                      >
                        Shop
                      </Button>
                    )}
                    {blogEnabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => quickAddPage("blog", "Blog")}
                      >
                        Blog
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => quickAddPage("contact", "Contact")}
                    >
                      Contact
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => quickAddPage("about", "About")}
                    >
                      About
                    </Button>
                  </div>
                </div>

                {servicesEnabled && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium">Services</h4>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={addServicesMenu}
                      >
                        Add Services menu
                        {(services?.length ?? 0) > 0 && (
                          <span className="text-muted-foreground ml-auto text-xs">
                            {services!.length} service
                            {services!.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {business.pages.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium">Your Pages</h4>
                    <div className="space-y-2">
                      {business.pages.map((page) => (
                        <Button
                          key={page.slug}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => quickAddPage(page.slug, page.title)}
                        >
                          {page.title}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
