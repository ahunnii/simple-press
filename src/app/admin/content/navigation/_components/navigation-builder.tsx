"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Info, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  FOOTER_QUICK_LINKS_TEMPLATES,
  topLevelNav,
} from "~/app/(storefront)/_components/nav";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";

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
    templateId: string;
    pages: Array<{ title: string; slug: string }>;
  };
  siteContent: {
    navigationItems: NavItem[];
    /** `null` = "use main navigation's top-level links"; `[]` = no footer quick links. */
    footerNavigationItems: NavChild[] | null;
  };
  servicesEnabled?: boolean;
  services?: Array<{ name: string; slug: string }>;
  /** Gates the Quick Add "Blog" shortcut. */
  blogEnabled?: boolean;
  /** Gates the Quick Add "Shop" shortcut. */
  productsEnabled?: boolean;
  /** Gates the Quick Add "Collections" shortcut. */
  collectionsEnabled?: boolean;
  /** Gates the Quick Add "Donate" shortcut. */
  donationsEnabled?: boolean;
  /** Label for the Donate quick-add button (e.g., "Donate", "Contribute"). */
  donationNavLabel?: string;
};

export function NavigationBuilder({
  business,
  siteContent,
  servicesEnabled,
  services,
  blogEnabled,
  productsEnabled,
  collectionsEnabled,
  donationsEnabled,
  donationNavLabel,
}: Props) {
  const router = useRouter();

  const [navItems, setNavItems] = useState<NavItem[]>(
    siteContent.navigationItems ?? [
      { label: "Home", href: "/" },
      { label: "Shop", href: "/shop" },
    ],
  );

  // Footer "Quick Links": `null` means "use main navigation" (mode "main"),
  // a saved array means "custom list" (mode "custom"). `footerItems` keeps
  // the custom rows in local state even while mode is "main" so toggling
  // back to Custom doesn't lose in-progress edits (see the mode-change
  // handler below, and Reset/isDirty further down).
  const [footerMode, setFooterMode] = useState<"main" | "custom">(
    siteContent.footerNavigationItems === null ? "main" : "custom",
  );
  const [footerItems, setFooterItems] = useState<NavChild[]>(
    siteContent.footerNavigationItems ?? [],
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
      footerNavigationItems: footerMode === "main" ? null : footerItems,
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

  const addFooterItem = () => {
    if (footerItems.length >= 12) return;
    setFooterItems([...footerItems, { label: "", href: "", external: false }]);
  };

  const updateFooterItem = <K extends keyof NavChild>(
    index: number,
    field: K,
    value: NavChild[K],
  ) => {
    const updated = [...footerItems];
    updated[index] = { ...updated[index]!, [field]: value };
    setFooterItems(updated);
  };

  const deleteFooterItem = (index: number) => {
    setFooterItems(footerItems.filter((_, i) => i !== index));
  };

  const moveFooterItem = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === footerItems.length - 1)
    ) {
      return;
    }

    const newIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...footerItems];
    [updated[index], updated[newIndex]] = [
      updated[newIndex]!,
      updated[index]!,
    ];
    setFooterItems(updated);
  };

  // Switching Custom → Main leaves `footerItems` alone (it just stops being
  // used) so toggling back doesn't lose work. Switching Main → Custom with an
  // empty custom list pre-fills from the live main nav, matching what the
  // footer would have shown a moment ago in "Use main navigation" mode.
  const handleFooterModeChange = (mode: "main" | "custom") => {
    if (mode === "custom" && footerItems.length === 0) {
      setFooterItems(topLevelNav(navItems));
    }
    setFooterMode(mode);
  };

  const startFooterFromMainNav = () => {
    if (
      footerItems.length > 0 &&
      !window.confirm(
        "Replace your custom footer links with your main navigation's top-level links?",
      )
    ) {
      return;
    }
    setFooterItems(topLevelNav(navItems));
  };

  const quickAddFooterItem = (item: NavChild) => {
    if (footerItems.length >= 12) return;
    setFooterItems([...footerItems, item]);
  };

  const mainNavPreview = topLevelNav(navItems);

  const templateHasFooterQuickLinks = FOOTER_QUICK_LINKS_TEMPLATES.includes(
    business.templateId,
  );

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

  const isNavDirty = navItems.length !== initialNavItems.length || !isSameOrder;

  const initialFooterMode: "main" | "custom" =
    siteContent.footerNavigationItems === null ? "main" : "custom";
  const initialFooterItems = siteContent.footerNavigationItems ?? [];
  const isFooterSameOrder =
    footerItems.length === initialFooterItems.length &&
    footerItems.every((item, i) => {
      const original = initialFooterItems[i];
      return (
        item.label === original?.label &&
        item.href === original.href &&
        (item.external ?? false) === (original.external ?? false)
      );
    });
  // Only "custom" list contents matter for dirty-checking: a "main" mode
  // footer never saves `footerItems`, so unsaved edits parked there while in
  // "main" mode shouldn't flip the Unsaved Changes badge.
  const isFooterDirty =
    footerMode !== initialFooterMode ||
    (footerMode === "custom" && !isFooterSameOrder);

  const isDirty = isNavDirty || isFooterDirty;

  const resetAll = () => {
    setNavItems(initialNavItems);
    setFooterMode(initialFooterMode);
    setFooterItems(initialFooterItems);
  };

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
            onClick={resetAll}
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
            the Site Editor. Footer links are set separately, in the
            &quot;Footer quick links&quot; section below.
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

            {/* Footer quick links */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Footer quick links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!templateHasFooterQuickLinks && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Not shown on your current template</AlertTitle>
                    <AlertDescription>
                      Your current template doesn&apos;t show a footer links
                      column, so these links won&apos;t appear until you
                      switch to a template that does.
                    </AlertDescription>
                  </Alert>
                )}

                <RadioGroup
                  value={footerMode}
                  onValueChange={(value) =>
                    handleFooterModeChange(value as "main" | "custom")
                  }
                  className="flex flex-col gap-3 sm:flex-row sm:gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="main" id="footer-mode-main" />
                    <Label htmlFor="footer-mode-main" className="font-normal">
                      Use main navigation
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="custom" id="footer-mode-custom" />
                    <Label
                      htmlFor="footer-mode-custom"
                      className="font-normal"
                    >
                      Custom list
                    </Label>
                  </div>
                </RadioGroup>

                {footerMode === "main" ? (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm">
                      Your footer shows the top-level links from your main
                      navigation. Dropdown links are left out to keep the
                      footer compact.
                    </p>
                    {mainNavPreview.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No links
                      </p>
                    ) : (
                      <ul className="space-y-1">
                        {mainNavPreview.map((item, i) => (
                          <li key={i} className="text-sm">
                            {item.label}{" "}
                            <span className="text-muted-foreground">
                              — {item.href}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startFooterFromMainNav}
                    >
                      Start from main navigation
                    </Button>

                    {footerItems.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        No quick links will show in your footer.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {footerItems.map((item, index) => (
                          <div key={index} className="rounded-md border p-3">
                            <div className="flex items-start gap-4">
                              <div className="flex flex-col gap-2 pt-2">
                                <button
                                  onClick={() => moveFooterItem(index, "up")}
                                  disabled={index === 0}
                                  aria-label="Move link up"
                                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                                >
                                  ▲
                                </button>
                                <button
                                  onClick={() =>
                                    moveFooterItem(index, "down")
                                  }
                                  disabled={index === footerItems.length - 1}
                                  aria-label="Move link down"
                                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                                >
                                  ▼
                                </button>
                              </div>

                              <div className="flex-1 space-y-3">
                                <div>
                                  <Label htmlFor={`footer-label-${index}`}>
                                    Label
                                  </Label>
                                  <Input
                                    id={`footer-label-${index}`}
                                    value={item.label}
                                    onChange={(e) =>
                                      updateFooterItem(
                                        index,
                                        "label",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Home"
                                    className="mt-1"
                                  />
                                </div>

                                <div>
                                  <Label htmlFor={`footer-href-${index}`}>
                                    URL
                                  </Label>
                                  <Input
                                    id={`footer-href-${index}`}
                                    value={item.href}
                                    onChange={(e) =>
                                      updateFooterItem(
                                        index,
                                        "href",
                                        e.target.value,
                                      )
                                    }
                                    placeholder="/products"
                                    className="mt-1"
                                  />
                                </div>

                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    id={`footer-external-${index}`}
                                    checked={item.external ?? false}
                                    onChange={(e) =>
                                      updateFooterItem(
                                        index,
                                        "external",
                                        e.target.checked,
                                      )
                                    }
                                    className="rounded"
                                    title="Open in new tab"
                                  />
                                  <Label
                                    htmlFor={`footer-external-${index}`}
                                    className="text-sm"
                                  >
                                    Open in new tab
                                  </Label>
                                </div>
                              </div>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteFooterItem(index)}
                                aria-label="Remove link"
                              >
                                <Trash2 className="text-destructive h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <Button
                        onClick={addFooterItem}
                        size="sm"
                        disabled={footerItems.length >= 12}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add link
                      </Button>
                      {footerItems.length >= 12 && (
                        <p className="text-muted-foreground mt-1 text-xs">
                          Footer quick links are limited to 12.
                        </p>
                      )}
                    </div>

                    <QuickAddPanel
                      flat
                      onAdd={quickAddFooterItem}
                      servicesEnabled={servicesEnabled}
                      services={services}
                      blogEnabled={blogEnabled}
                      productsEnabled={productsEnabled}
                      collectionsEnabled={collectionsEnabled}
                      donationsEnabled={donationsEnabled}
                      donationNavLabel={donationNavLabel}
                      pages={business.pages}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Add */}
          <div>
            <QuickAddPanel
              flat={false}
              onAdd={(item) => setNavItems([...navItems, item])}
              onAddPage={quickAddPage}
              servicesEnabled={servicesEnabled}
              services={services}
              blogEnabled={blogEnabled}
              productsEnabled={productsEnabled}
              collectionsEnabled={collectionsEnabled}
              donationsEnabled={donationsEnabled}
              donationNavLabel={donationNavLabel}
              pages={business.pages}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type QuickAddPanelProps = {
  /** Flat/footer mode: "Services" quick-add becomes a plain link, no children. */
  flat: boolean;
  /** Adds a single item (used for every shortcut except main-nav "Your Pages"/common pages, which also toasts via `onAddPage`). */
  onAdd: (item: NavItem) => void;
  /** Main-nav mode only: adds a page shortcut and shows a toast. When omitted, `onAdd` is used directly (footer mode). */
  onAddPage?: (slug: string, title: string) => void;
  servicesEnabled?: boolean;
  services?: Array<{ name: string; slug: string }>;
  blogEnabled?: boolean;
  productsEnabled?: boolean;
  collectionsEnabled?: boolean;
  donationsEnabled?: boolean;
  donationNavLabel?: string;
  pages: Array<{ title: string; slug: string }>;
};

/**
 * Shared "Quick Add" shortcuts for both the main nav (`flat={false}`, one
 * level of children allowed — see the Services shortcut) and the footer
 * quick links (`flat={true}`, always a plain link). Extracted so the two
 * lists don't duplicate this ~110-line button list.
 */
function QuickAddPanel({
  flat,
  onAdd,
  onAddPage,
  servicesEnabled,
  services,
  blogEnabled,
  productsEnabled,
  collectionsEnabled,
  donationsEnabled,
  donationNavLabel,
  pages,
}: QuickAddPanelProps) {
  const addPage = (slug: string, title: string) => {
    if (onAddPage) {
      onAddPage(slug, title);
      return;
    }
    onAdd({ label: title, href: `/${slug}`, external: false });
    toast.success(`Added "${title}" to footer`);
  };

  const addServices = () => {
    if (flat) {
      onAdd({ label: "Services", href: "/services", external: false });
      toast.success('Added "Services" to footer');
      return;
    }
    onAdd({
      label: "Services",
      href: "/services",
      external: false,
      children: (services ?? []).map((s) => ({
        label: s.name,
        href: `/services/${s.slug}`,
      })),
    });
    toast.success("Added Services menu to navigation");
  };

  return (
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
                onClick={() => addPage("collections", "Collections")}
              >
                Collections
              </Button>
            )}
            {productsEnabled && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => addPage("shop", "Shop")}
              >
                Shop
              </Button>
            )}
            {blogEnabled && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => addPage("blog", "Blog")}
              >
                Blog
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => addPage("contact", "Contact")}
            >
              Contact
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => addPage("about", "About")}
            >
              About
            </Button>
            {donationsEnabled && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() =>
                  addPage("donate", donationNavLabel ?? "Donate")
                }
              >
                {donationNavLabel ?? "Donate"}
              </Button>
            )}
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
                onClick={addServices}
              >
                {flat ? "Services" : "Add Services menu"}
                {!flat && (services?.length ?? 0) > 0 && (
                  <span className="text-muted-foreground ml-auto text-xs">
                    {services!.length} service
                    {services!.length !== 1 ? "s" : ""}
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}

        {pages.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-medium">Your Pages</h4>
            <div className="space-y-2">
              {pages.map((page) => (
                <Button
                  key={page.slug}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => addPage(page.slug, page.title)}
                >
                  {page.title}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
