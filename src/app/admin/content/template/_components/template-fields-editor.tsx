/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  Download,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import type { PreviewPaneHandle } from "~/components/preview/preview-pane";
import type { TemplateField } from "~/lib/template-fields";
import { PREVIEW_COOKIE } from "~/lib/preview/preview-constants";
import {
  getGroupMetadata,
  groupFieldsByGroup,
  groupFieldsByPage,
  PAGE_METADATA,
} from "~/lib/template-fields";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { PreviewPane } from "~/components/preview/preview-pane";
import { ResetFormButton } from "~/components/shared/reset-form-button";
import { SaveFormButton } from "~/components/shared/save-form-button";

import { FieldGroup } from "./template-field-widgets";

export {
  TemplateImageUploadField,
  TemplateVideoUploadField,
} from "./template-field-widgets";

/** Map editor page tab keys to storefront paths for the preview iframe. */
const PAGE_PREVIEW_PATHS: Record<string, string> = {
  homepage: "/",
  about: "/about",
  blog: "/blog",
  contact: "/contact",
  collections: "/collections",
  testimonials: "/testimonials",
  // The "products" tab edits the shop/product-listing page, served at /shop.
  products: "/shop",
  // happy-bamboo groups its shop listing fields under a "shop" page key.
  shop: "/shop",
};

type Props = {
  business: {
    id: string;
    templateId: string;
  };
  siteContent: {
    customFields: any;
  };
  embedsEnabled?: boolean;
};

export function TemplateFieldsEditor({
  business,
  siteContent,
  embedsEnabled,
}: Props) {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("homepage");
  // Full-width Form ⇄ Preview toggle — used at ALL breakpoints.
  const [view, setView] = useState<"form" | "preview">("form");

  // Derive the storefront path to load in the preview iframe for the active tab.
  const previewPath = PAGE_PREVIEW_PATHS[activeTab] ?? "/";

  // Ref to the PreviewPane so we can call refresh() and focusGroup() imperatively.
  const previewRef = useRef<PreviewPaneHandle>(null);
  // Whether a draft flush is in-flight (shows shimmer).
  const [isUpdating, setIsUpdating] = useState(false);
  // Pending scroll-to-group after tab switch renders.
  const [pendingScroll, setPendingScroll] = useState<{
    page: string;
    group: string;
  } | null>(null);

  // Group fields by page
  const groupedByPage = groupFieldsByPage(business.templateId);
  const allPages = Object.keys(groupedByPage);

  // Initialize custom fields
  const initialFields = (siteContent.customFields ?? {}) as Record<
    string,
    unknown
  >;
  const [customFields, setCustomFields] =
    useState<Record<string, unknown>>(initialFields);

  // Store initial state for comparison — lazy initializer keeps customPairsKeys
  // in sync with customPairs from the very first render, preventing false dirty.
  const [initialState, setInitialState] = useState(() => {
    const allTemplateKeys = new Set(
      Object.values(groupedByPage)
        .flat()
        .map((f) => f.key),
    );
    const initialCustomKeys = new Set(
      Object.entries(initialFields)
        .filter(
          ([key, value]) =>
            !allTemplateKeys.has(key) &&
            typeof value === "string" &&
            value !== "",
        )
        .map(([key]) => key),
    );
    return {
      fields: { ...initialFields } as Record<string, unknown>,
      customPairsKeys: initialCustomKeys,
    };
  });

  // Track which fields have been modified
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());

  // Refs for richtext dirty-state fix and import
  const dirtyBaselineRef = useRef(false);
  const savedFieldsRef = useRef<Record<string, unknown>>({});
  const importInputRef = useRef<HTMLInputElement>(null);

  // Custom key-value pairs (organized by page)
  const [customPairs, setCustomPairs] = useState<
    Array<{ key: string; value: string; page: string }>
  >(() => {
    const allTemplateKeys = new Set(
      Object.values(groupedByPage)
        .flat()
        .map((f) => f.key),
    );
    return Object.entries(initialFields)
      .filter(([key]) => !allTemplateKeys.has(key))
      .map(([key, value]) => {
        const page = key.split(".")[0] ?? "global";
        return { key, value: typeof value === "string" ? value : "", page };
      });
  });

  const updateSiteContent = api.content.updateSiteContent.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Template fields updated");
      setModifiedFields(new Set());
      requestAnimationFrame(() => {
        setModifiedFields(new Set());
        setInitialState((prev) => ({
          ...prev,
          fields: { ...savedFieldsRef.current },
        }));
      });
      // Refresh the preview iframe so it shows the newly-published content.
      previewRef.current?.refresh();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message || "Failed to update");
    },
    onSettled: () => {
      router.refresh();
    },
    onMutate: () => {
      toast.loading("Updating template fields...");
    },
  });

  // Draft save mutation — orthogonal to publish; does NOT touch modifiedFields/initialState.
  const savePreviewDraft = api.content.savePreviewDraft.useMutation();

  // Clear draft mutation — called on unmount and pagehide.
  const clearPreviewDraft = api.content.clearPreviewDraft.useMutation();

  const isSaving = updateSiteContent.isPending;

  // Set the preview cookie on mount; clear cookie AND draft on unmount.
  useEffect(() => {
    document.cookie = `${PREVIEW_COOKIE}=${business.id}; path=/; SameSite=Lax`;
    return () => {
      document.cookie = `${PREVIEW_COOKIE}=; path=/; Max-Age=0; SameSite=Lax`;
      clearPreviewDraft.mutate();
    };
  }, [business.id]);

  // pagehide: synchronously clear the cookie (the load-bearing part) so closing
  // the tab removes the swap signal even if the React unmount doesn't fire.
  useEffect(() => {
    const onPageHide = () => {
      document.cookie = `${PREVIEW_COOKIE}=; path=/; Max-Age=0; SameSite=Lax`;
      // Best-effort — may not complete on tab close, but the cookie clear above is enough.
      clearPreviewDraft.mutate();
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  /**
   * Flush the current in-memory fields to the preview draft.
   * Called when switching to Preview view, Refresh, and Open-in-new-tab.
   * Returns a promise so callers can await it before refreshing.
   */
  const flushDraft = useCallback(
    async (
      fields: Record<string, unknown>,
      pairs: Array<{ key: string; value: string; page: string }>,
    ) => {
      const allFields = { ...fields };
      pairs.forEach((pair) => {
        if (pair.key && pair.value) {
          allFields[pair.key] = pair.value;
        }
      });
      setIsUpdating(true);
      try {
        await savePreviewDraft.mutateAsync({ customFields: allFields });
      } finally {
        setIsUpdating(false);
      }
    },
    [],
  );

  const handleSave = () => {
    const allFields = { ...customFields };
    customPairs.forEach((pair) => {
      if (pair.key && pair.value) {
        allFields[pair.key] = pair.value;
      }
    });
    savedFieldsRef.current = allFields;

    updateSiteContent.mutate({
      customFields: allFields,
    });
  };

  const handleReset = () => {
    setCustomFields({ ...initialFields });
    setCustomPairs(customPairs.filter((p) => p.key && p.value));
    setModifiedFields(new Set());
  };

  // handleFieldChange only updates local state — no per-keystroke autosave.
  const handleFieldChange = (key: string, value: unknown) => {
    setCustomFields((prev) => ({ ...prev, [key]: value }));
    setModifiedFields((prev) => new Set(prev).add(key));
  };

  // Re-baseline after TipTap normalizes on mount to prevent false dirty state
  useEffect(() => {
    if (dirtyBaselineRef.current) return;
    dirtyBaselineRef.current = true;
    const raf = requestAnimationFrame(() => setModifiedFields(new Set()));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleExport = () => {
    const prefix = `${business.templateId}.`;
    const exportData: Record<string, unknown> = {
      _templateId: business.templateId,
    };
    for (const [key, value] of Object.entries(customFields)) {
      if (key.startsWith(prefix)) exportData[key] = value;
    }
    customPairs.forEach((p) => {
      if (p.key.startsWith(prefix) && p.value) exportData[p.key] = p.value;
    });

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${business.templateId}-fields.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as Record<
          string,
          unknown
        >;
        const prefix = `${business.templateId}.`;
        const allTemplateKeys = new Set(
          Object.values(groupedByPage)
            .flat()
            .map((f) => f.key),
        );
        const newCustomFields = { ...customFields };
        const newModified = new Set(modifiedFields);
        const newCustomPairs = [...customPairs];
        let count = 0;

        for (const [key, value] of Object.entries(parsed)) {
          if (key === "_templateId") continue;
          // Only import keys that belong to this template
          if (!key.startsWith(prefix)) continue;
          if (allTemplateKeys.has(key)) {
            newCustomFields[key] = value;
            newModified.add(key);
            count++;
          } else if (typeof value === "string") {
            const page = key.split(".")[1] ?? "global";
            const existing = newCustomPairs.findIndex((p) => p.key === key);
            if (existing >= 0) newCustomPairs[existing] = { key, value, page };
            else newCustomPairs.push({ key, value, page });
            count++;
          }
        }

        setCustomFields(newCustomFields);
        setModifiedFields(newModified);
        setCustomPairs(newCustomPairs);
        toast.success(`Imported ${count} field${count !== 1 ? "s" : ""}`);
      } catch {
        toast.error("Invalid JSON file");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  };

  const addCustomPair = (page: string) => {
    setCustomPairs([...customPairs, { key: "", value: "", page }]);
  };

  // Filter fields by search
  const filterFields = (fields: TemplateField[]) => {
    if (!searchQuery) return fields;
    return fields.filter(
      (field) =>
        field.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        field.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        field.key.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  };

  const getFieldsForPage = (page: string) => {
    const templateFields = groupedByPage[page] ?? [];
    const pageCustomPairs = customPairs.filter((p) => p.page === page);
    return { templateFields, customPairs: pageCustomPairs };
  };

  const getPageTabStats = (page: string) => {
    const meta = PAGE_METADATA[page as keyof typeof PAGE_METADATA];
    const { templateFields, customPairs: pagePairs } = getFieldsForPage(page);
    const totalFields = templateFields.length + pagePairs.length;
    const modifiedCount = [
      ...templateFields.map((f) => f.key),
      ...pagePairs.map((p) => p.key),
    ].filter((key) => modifiedFields.has(key)).length;
    return { meta, totalFields, modifiedCount };
  };

  // Update initial state when data loads
  useEffect(() => {
    const allTemplateKeys = new Set(
      Object.values(groupedByPage)
        .flat()
        .map((f) => f.key),
    );
    const initialCustomKeys = new Set(
      Object.entries(initialFields)
        .filter(
          ([key, value]) =>
            !allTemplateKeys.has(key) &&
            typeof value === "string" &&
            value !== "",
        )
        .map(([key]) => key),
    );

    setInitialState({
      fields: { ...initialFields },
      customPairsKeys: initialCustomKeys,
    });
  }, [JSON.stringify(initialFields)]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    // Check modified template fields
    if (modifiedFields.size > 0) {
      return true;
    }

    // Check if custom pairs changed
    const currentCustomKeys = new Set(
      customPairs.filter((p) => p.key && p.value).map((p) => p.key),
    );

    // Different number of custom fields
    if (currentCustomKeys.size !== initialState.customPairsKeys.size) {
      return true;
    }

    // Check if any custom field keys are different
    for (const key of currentCustomKeys) {
      if (!initialState.customPairsKeys.has(key)) {
        return true;
      }
    }

    // Check if any custom field values changed
    for (const pair of customPairs) {
      if (pair.key && pair.value) {
        const initialValue = initialState.fields[pair.key];
        if (initialValue !== pair.value) {
          return true;
        }
      }
    }

    return false;
  }, [modifiedFields, customPairs, initialState]);

  const isDirty = hasUnsavedChanges();
  const activeTabStats = getPageTabStats(activeTab);

  /**
   * Called when the storefront overlay sends sp:edit-group.
   * Switches to Form view, switches to the correct page tab, then defers the
   * scroll until React has rendered the tab content (via pendingScroll + useEffect).
   * `group` is the full data-sp-group value (e.g. "homepage.hero"), which matches
   * the Card id `fieldgroup-<page>-<group>` directly.
   */
  const handleEditGroup = useCallback((page: string, group: string) => {
    setView("form");
    setActiveTab(page);
    setPendingScroll({ page, group });
  }, []);

  // Scroll to the pending group once the correct tab + form are rendered.
  useEffect(() => {
    if (!pendingScroll) return;
    if (view !== "form" || activeTab !== pendingScroll.page) return;
    const id = `fieldgroup-${pendingScroll.page}-${pendingScroll.group}`;
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.focus({ preventScroll: true });
      }
      setPendingScroll(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [pendingScroll, view, activeTab]);

  /**
   * Switch to Preview view: flush the current draft then refresh the iframe.
   */
  const switchToPreview = useCallback(async () => {
    setView("preview");
    await flushDraft(customFields, customPairs);
    previewRef.current?.refresh();
  }, [flushDraft, customFields, customPairs]);

  /**
   * Refresh handler passed to PreviewPane — flushes current edits then reloads.
   */
  const handleRefresh = useCallback(async () => {
    await flushDraft(customFields, customPairs);
    previewRef.current?.refresh();
  }, [flushDraft, customFields, customPairs]);

  /**
   * Open-in-new-tab handler — flushes draft so the new tab shows the latest edits.
   */
  const handleOpenExternal = useCallback(async () => {
    await flushDraft(customFields, customPairs);
    window.open(`${previewPath}?__preview=1`, "_blank", "noopener");
  }, [flushDraft, customFields, customPairs, previewPath]);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

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
            <h1 className="text-base font-medium">Template Fields </h1>

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
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            aria-label="Import template fields JSON"
            className="hidden"
            onChange={handleImport}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="hidden md:inline-flex"
                aria-label="More template field actions"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  queueMicrotask(() => importInputRef.current?.click());
                }}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import JSON
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <ResetFormButton
            disabled={isSaving || !isDirty}
            handleReset={handleReset}
          />

          <SaveFormButton
            disabled={isSaving}
            handleSave={handleSave}
            isSaving={isSaving}
          />
        </div>
      </div>

      {/* Form ⇄ Preview segmented toggle — all breakpoints */}
      <div className="bg-card flex items-center justify-center gap-1 border-b px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={view === "form"}
          onClick={() => setView("form")}
          className={cn(
            "gap-1.5",
            view === "form" && "bg-secondary text-secondary-foreground",
          )}
        >
          <Pencil className="h-3.5 w-3.5" />
          Form
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={view === "preview"}
          onClick={() => void switchToPreview()}
          className={cn(
            "gap-1.5",
            view === "preview" && "bg-secondary text-secondary-foreground",
          )}
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </Button>
      </div>

      {/* Single full-width column — both panes stay mounted, toggled with hidden */}
      <div className="h-[calc(100vh-var(--toolbar-height,56px)-42px)]">
        {/* ── Fields pane ── */}
        <div
          className={cn(
            "h-full overflow-y-auto px-4 py-6 sm:px-6",
            view === "preview" ? "hidden" : "block",
          )}
        >
          <div className="mx-auto max-w-4xl">
            {/* Main Content */}
            <Card>
              <CardHeader>
                <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                  <div className="w-full">
                    <CardTitle className="flex items-center gap-2">
                      Template Content{" "}
                      <Badge variant="outline" className="capitalize">
                        {business.templateId} Template
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Edit content organized by page and grouped by section
                    </CardDescription>
                  </div>

                  {/* Search */}
                  <div className="flex w-full items-center gap-2 md:w-auto">
                    <div className="relative w-full md:w-64">
                      <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                      <Input
                        placeholder="Search fields..."
                        aria-label="Search fields"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchQuery("")}
                      >
                        Clear <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <div className="mb-6 sm:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-auto min-h-9 w-full justify-between gap-2 px-3 py-2 font-normal"
                        >
                          <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
                            <span className="shrink-0">
                              {activeTabStats.meta?.icon || "📄"}
                            </span>
                            <span className="truncate">
                              {activeTabStats.meta?.title || activeTab}
                            </span>
                            {activeTabStats.totalFields > 0 && (
                              <Badge
                                variant={
                                  activeTabStats.modifiedCount > 0
                                    ? "default"
                                    : "secondary"
                                }
                                className="ml-auto h-5 w-5 shrink-0 rounded-full p-0 text-xs"
                              >
                                {activeTabStats.totalFields}
                              </Badge>
                            )}
                          </span>
                          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="max-h-[min(60vh,22rem)] w-(--radix-dropdown-menu-trigger-width) overflow-y-auto"
                        align="start"
                      >
                        <DropdownMenuRadioGroup
                          value={activeTab}
                          onValueChange={setActiveTab}
                        >
                          {allPages.map((page) => {
                            const { meta, totalFields, modifiedCount } =
                              getPageTabStats(page);
                            return (
                              <DropdownMenuRadioItem
                                key={page}
                                value={page}
                                className="min-w-0 pr-2"
                              >
                                <span className="mr-1 shrink-0">
                                  {meta?.icon || "📄"}
                                </span>
                                <span className="min-w-0 flex-1 truncate">
                                  {meta?.title || page}
                                </span>
                                {totalFields > 0 && (
                                  <Badge
                                    variant={
                                      modifiedCount > 0
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="ml-auto h-5 w-5 shrink-0 rounded-full p-0 text-xs"
                                  >
                                    {totalFields}
                                  </Badge>
                                )}
                              </DropdownMenuRadioItem>
                            );
                          })}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <TabsList className="mb-6 hidden max-w-full flex-wrap sm:inline-flex">
                    {allPages.map((page) => {
                      const { meta, totalFields, modifiedCount } =
                        getPageTabStats(page);
                      return (
                        <TabsTrigger
                          key={page}
                          value={page}
                          className="relative w-fit"
                        >
                          <span className="mr-1">{meta?.icon || "📄"}</span>
                          <span>{meta?.title || page}</span>
                          {totalFields > 0 && (
                            <Badge
                              variant={
                                modifiedCount > 0 ? "default" : "secondary"
                              }
                              className="ml-1 h-5 w-5 rounded-full p-0 text-xs"
                            >
                              {totalFields}
                            </Badge>
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>

                  {allPages.map((page) => {
                    const meta =
                      PAGE_METADATA[page as keyof typeof PAGE_METADATA];
                    const { templateFields, customPairs: pagePairs } =
                      getFieldsForPage(page);
                    const filteredFields = filterFields(templateFields);

                    // Group fields by their group property
                    const fieldGroups = groupFieldsByGroup(filteredFields);

                    return (
                      <TabsContent
                        key={page}
                        value={page}
                        className="space-y-6"
                      >
                        {/* Page Description */}
                        {meta && (
                          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{meta.icon}</span>
                              <div>
                                <h3 className="font-medium text-blue-900">
                                  {meta.title}
                                </h3>
                                <p className="text-sm text-blue-700">
                                  {meta.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Grouped Template Fields */}
                        {Object.entries(fieldGroups).map(
                          ([groupId, fields]) => {
                            if (fields.length === 0) return null;

                            const groupMeta = getGroupMetadata(
                              business.templateId,
                              groupId,
                            );
                            const isUngrouped = groupId === "ungrouped";

                            return (
                              <FieldGroup
                                key={groupId}
                                groupId={groupId}
                                page={page}
                                groupMeta={groupMeta}
                                fields={fields}
                                customFields={customFields}
                                modifiedFields={modifiedFields}
                                onFieldChange={handleFieldChange}
                                isUngrouped={isUngrouped}
                                embedsEnabled={embedsEnabled}
                              />
                            );
                          },
                        )}

                        {filteredFields.length === 0 &&
                          templateFields.length > 0 && (
                            <div className="border-border rounded-lg border border-dashed p-12 text-center">
                              <p className="text-muted-foreground">
                                No fields match your search
                              </p>
                              <Button
                                variant="link"
                                onClick={() => setSearchQuery("")}
                                className="mt-2"
                              >
                                Clear search
                              </Button>
                            </div>
                          )}

                        {templateFields.length > 0 && <Separator />}

                        {/* Empty state */}
                        {templateFields.length === 0 &&
                          pagePairs.length === 0 && (
                            <div className="border-border rounded-lg border border-dashed p-12 text-center">
                              <p className="text-muted-foreground mb-3">
                                No template fields defined for this page yet
                              </p>
                              <Button
                                onClick={() => addCustomPair(page)}
                                size="sm"
                                variant="outline"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Custom Field
                              </Button>
                            </div>
                          )}
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </CardContent>
            </Card>
          </div>
          {/* /max-w-4xl */}
        </div>
        {/* /fields pane */}

        {/* ── Preview pane — mounted always, hidden when not active ── */}
        <div
          className={cn(
            "bg-muted/20 h-full",
            view === "form" ? "hidden" : "block",
          )}
        >
          <div className="h-full p-4">
            <PreviewPane
              ref={previewRef}
              isUpdating={isUpdating}
              onEditGroup={handleEditGroup}
              onRefresh={() => void handleRefresh()}
              onOpenExternal={() => void handleOpenExternal()}
              path={previewPath}
            />
          </div>
        </div>
      </div>
      {/* /full-width column */}
    </div>
  );
}
