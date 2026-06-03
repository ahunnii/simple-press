/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type { Content } from "@tiptap/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@better-upload/client";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { toast } from "sonner";

import type { PreviewPaneHandle } from "~/components/preview/preview-pane";
import { PREVIEW_COOKIE } from "~/lib/preview/preview-constants";

import type {
  TemplateField,
  TemplateFieldGroup,
  TemplateListItemField,
  TemplateListRow,
} from "~/lib/template-fields";
import {
  getLucideTemplateIcon,
  TEMPLATE_LUCIDE_ICON_NAMES,
} from "~/lib/lucide-template-icons";
import {
  getGroupMetadata,
  groupFieldsByGroup,
  groupFieldsByPage,
  PAGE_METADATA,
  parseTemplateListRows,
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
import { Label } from "~/components/ui/label";
import { MinimalTiptapEditor } from "~/components/ui/minimal-tiptap";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { ResetFormButton } from "~/components/shared/reset-form-button";
import { SaveFormButton } from "~/components/shared/save-form-button";
import { PreviewPane } from "~/components/preview/preview-pane";

const EMPTY_TIPTAP_DOC: Content = { type: "doc", content: [] };

/** Map editor page tab keys to storefront paths for the preview iframe. */
const PAGE_PREVIEW_PATHS: Record<string, string> = {
  homepage: "/",
  about: "/about",
  blog: "/blog",
  contact: "/contact",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isRichTextValue(value: unknown): value is Content {
  return (
    isRecord(value) &&
    value.type === "doc" &&
    Array.isArray((value as { content?: unknown }).content)
  );
}

type Props = {
  business: {
    id: string;
    templateId: string;
  };
  siteContent: {
    customFields: any;
  };
};

export function TemplateFieldsEditor({ business, siteContent }: Props) {
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
      console.log("Unsaved: modifiedFields present", modifiedFields);
      return true;
    } else {
      console.log("No modifiedFields");
    }

    // Check if custom pairs changed
    const currentCustomKeys = new Set(
      customPairs.filter((p) => p.key && p.value).map((p) => p.key),
    );

    // Different number of custom fields
    if (currentCustomKeys.size !== initialState.customPairsKeys.size) {
      console.log(
        "Unsaved: custom field key count mismatch",
        { currentCustomKeys: Array.from(currentCustomKeys) },
        { initialCustomPairsKeys: Array.from(initialState.customPairsKeys) },
      );
      return true;
    } else {
      console.log("Custom field key count matches");
    }

    // Check if any custom field keys are different
    for (const key of currentCustomKeys) {
      if (!initialState.customPairsKeys.has(key)) {
        console.log("Unsaved: Found new custom key", key);
        return true;
      }
    }
    console.log("No new custom keys");

    // Check if any custom field values changed
    for (const pair of customPairs) {
      if (pair.key && pair.value) {
        const initialValue = initialState.fields[pair.key];
        if (initialValue !== pair.value) {
          console.log("Unsaved: custom value changed", {
            key: pair.key,
            initialValue,
            currentValue: pair.value,
          });
          return true;
        }
      }
    }
    console.log("No custom values changed");

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
    <div className="min-h-screen bg-gray-50">
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
      <div className="flex items-center justify-center gap-1 border-b bg-white px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={view === "form"}
          onClick={() => setView("form")}
          className={cn("gap-1.5", view === "form" && "bg-secondary text-secondary-foreground")}
        >
          <Pencil className="h-3.5 w-3.5" />
          Form
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={view === "preview"}
          onClick={() => void switchToPreview()}
          className={cn("gap-1.5", view === "preview" && "bg-secondary text-secondary-foreground")}
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
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search fields..."
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
                                  modifiedCount > 0 ? "default" : "secondary"
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
                          variant={modifiedCount > 0 ? "default" : "secondary"}
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
                const meta = PAGE_METADATA[page as keyof typeof PAGE_METADATA];
                const { templateFields, customPairs: pagePairs } =
                  getFieldsForPage(page);
                const filteredFields = filterFields(templateFields);

                // Group fields by their group property
                const fieldGroups = groupFieldsByGroup(filteredFields);

                return (
                  <TabsContent key={page} value={page} className="space-y-6">
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
                    {Object.entries(fieldGroups).map(([groupId, fields]) => {
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
                          businessId={business.id}
                        />
                      );
                    })}

                    {filteredFields.length === 0 &&
                      templateFields.length > 0 && (
                        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
                          <p className="text-gray-500">
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

                    {/* Custom Fields for this page - unchanged */}
                    {/* <CustomFieldsSection
                      page={page}
                      customPairs={pagePairs}
                      allCustomPairs={customPairs}
                      onAdd={() => addCustomPair(page)}
                      onUpdate={updateCustomPair}
                      onDelete={deleteCustomPair}
                    /> */}

                    {/* Empty state */}
                    {templateFields.length === 0 && pagePairs.length === 0 && (
                      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
                        <p className="mb-3 text-gray-500">
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
          </div>{/* /max-w-4xl */}
        </div>{/* /fields pane */}

        {/* ── Preview pane — mounted always, hidden when not active ── */}
        <div
          className={cn(
            "h-full bg-muted/20",
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
      </div>{/* /full-width column */}
    </div>
  );
}

// Field Group Component
function FieldGroup({
  groupId,
  page,
  groupMeta,
  fields,
  customFields,
  modifiedFields,
  onFieldChange,
  isUngrouped,
  businessId: _businessId,
}: {
  groupId: string;
  page: string;
  groupMeta?: TemplateFieldGroup;
  fields: TemplateField[];
  customFields: Record<string, unknown>;
  modifiedFields: Set<string>;
  onFieldChange: (key: string, value: unknown) => void;
  isUngrouped: boolean;
  businessId: string;
}) {
  const columns = groupMeta?.columns ?? 1;

  return (
    // Stable id + tabIndex so handleEditGroup can scroll/focus this group.
    <Card id={`fieldgroup-${page}-${groupId}`} tabIndex={-1}>
      <CardHeader>
        {!isUngrouped && groupMeta && (
          <div className="flex items-center gap-2">
            {groupMeta.icon && (
              <span className="text-xl">{groupMeta.icon}</span>
            )}
            <div>
              <CardTitle className="text-base">{groupMeta.title}</CardTitle>
              {groupMeta.description && (
                <CardDescription className="mt-1">
                  {groupMeta.description}
                </CardDescription>
              )}
            </div>
          </div>
        )}
        {isUngrouped && (
          <CardTitle className="text-base">Other Fields</CardTitle>
        )}
      </CardHeader>
      <CardContent>
        <div
          className={`grid gap-6 ${
            columns === 1
              ? "grid-cols-1"
              : columns === 2
                ? "grid-cols-1 md:grid-cols-2"
                : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {fields.map((field) => (
            <div key={field.key} className={field.gridColumn ?? "col-span-1"}>
              <FieldInput
                field={field}
                value={customFields[field.key]}
                isModified={modifiedFields.has(field.key)}
                onChange={(value) => onFieldChange(field.key, value)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ListItemSubFieldInput({
  subField,
  value,
  onChange,
}: {
  subField: TemplateListItemField;
  value: string;
  onChange: (v: string) => void;
}) {
  const baseId = useId();
  const labelId = `${baseId}-${subField.key}`;

  if (subField.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={labelId} className="text-xs text-gray-600">
          {subField.label}
        </Label>
        <Textarea
          id={labelId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={subField.placeholder ?? subField.description}
          rows={3}
        />
      </div>
    );
  }

  if (subField.type === "image") {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-600">{subField.label}</Label>
        <TemplateImageUploadField
          value={value}
          onChange={onChange}
          description={subField.description}
        />
      </div>
    );
  }

  if (subField.type === "video") {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-600">{subField.label}</Label>
        <TemplateVideoUploadField
          value={value}
          onChange={onChange}
          description={subField.description}
        />
      </div>
    );
  }

  if (subField.type === "icon") {
    const selected = value || TEMPLATE_LUCIDE_ICON_NAMES[0];
    const Preview = getLucideTemplateIcon(selected);
    return (
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-600">{subField.label}</Label>
        <div className="flex items-center gap-2">
          {Preview ? (
            <Preview className="text-muted-foreground h-5 w-5 shrink-0" />
          ) : null}
          <Select value={selected} onValueChange={(v) => onChange(v)}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Icon" />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATE_LUCIDE_ICON_NAMES.map((name) => {
                const Icon = getLucideTemplateIcon(name);
                return (
                  <SelectItem key={name} value={name}>
                    <span className="flex items-center gap-2">
                      {Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
                      {name}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  const inputType = subField.type === "url" ? "url" : "text";

  return (
    <div className="space-y-1.5">
      <Label htmlFor={labelId} className="text-xs text-gray-600">
        {subField.label}
      </Label>
      <Input
        id={labelId}
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={subField.placeholder ?? subField.description}
      />
    </div>
  );
}

function TemplateListFieldEditor({
  field,
  value,
  onChange,
}: {
  field: Extract<TemplateField, { type: "list" }>;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const rows = parseTemplateListRows(value);
  const minItems = field.minItems ?? 0;
  const maxItems = field.maxItems ?? 50;

  const setRows = (next: TemplateListRow[]) => onChange(next);

  const addRow = () => {
    if (rows.length >= maxItems) return;
    const item: TemplateListRow = { _id: crypto.randomUUID() };
    for (const sf of field.itemSchema) {
      item[sf.key] = sf.type === "icon" ? TEMPLATE_LUCIDE_ICON_NAMES[0] : "";
    }
    setRows([...rows, item]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= minItems) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const moveRow = (index: number, delta: -1 | 1) => {
    const j = index + delta;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    const a = next[index]!;
    const b = next[j]!;
    next[index] = b;
    next[j] = a;
    setRows(next);
  };

  const updateCell = (rowIndex: number, key: string, v: string) => {
    const next = [...rows];
    const row = { ...next[rowIndex]! };
    row[key] = v;
    next[rowIndex] = row;
    setRows(next);
  };

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <p className="text-sm text-gray-500">No items yet. Add one below.</p>
      )}
      {rows.map((row, rowIndex) => (
        <div
          key={String(row._id ?? rowIndex)}
          className="rounded-lg border border-gray-200 bg-gray-50/80 p-4"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-800">
              Item {rowIndex + 1}
            </span>
            <div className="flex items-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Move up"
                disabled={rowIndex === 0}
                onClick={() => moveRow(rowIndex, -1)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Move down"
                disabled={rowIndex >= rows.length - 1}
                onClick={() => moveRow(rowIndex, 1)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-600 hover:text-red-700"
                aria-label="Remove item"
                disabled={rows.length <= minItems}
                onClick={() => removeRow(rowIndex)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {field.itemSchema.map((sf) => {
              const raw = row[sf.key];
              const cell =
                typeof raw === "string" ? raw : raw == null ? "" : "";
              return (
                <ListItemSubFieldInput
                  key={sf.key}
                  subField={sf}
                  value={cell}
                  onChange={(v) => updateCell(rowIndex, sf.key, v)}
                />
              );
            })}
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        disabled={rows.length >= maxItems}
      >
        <Plus className="mr-2 h-4 w-4" />
        Add item
      </Button>
    </div>
  );
}

// Field Input Component (extracted for reuse)
function FieldInput({
  field,
  value,
  isModified,
  onChange,
}: {
  field: TemplateField;
  value: unknown;
  isModified: boolean;
  onChange: (value: unknown) => void;
}) {
  const stringValue = typeof value === "string" ? value : "";
  const richTextValue = isRichTextValue(value) ? value : EMPTY_TIPTAP_DOC;

  return (
    <div className="space-y-2">
      <Label htmlFor={field.key} className="flex items-center gap-2">
        {field.label}
        {isModified && (
          <Badge variant="outline" className="text-xs">
            Modified
          </Badge>
        )}
      </Label>

      {field.type === "list" ? (
        <TemplateListFieldEditor
          field={field}
          value={value}
          onChange={onChange}
        />
      ) : field.type === "image" ? (
        // Image upload field (uses better-upload)
        <TemplateImageUploadField
          value={stringValue}
          onChange={(nextValue) => onChange(nextValue)}
          description={field.description}
        />
      ) : field.type === "video" ? (
        <TemplateVideoUploadField
          value={stringValue}
          onChange={(nextValue) => onChange(nextValue)}
          description={field.description}
        />
      ) : field.type === "gallery" ? (
        <GalleryFieldSelect
          value={stringValue}
          onChange={(nextValue) => onChange(nextValue)}
        />
      ) : field.type === "collection" ? (
        <CollectionFieldSelect
          value={stringValue}
          onChange={(nextValue) => onChange(nextValue)}
        />
      ) : field.type === "richtext" ? (
        <MinimalTiptapEditor
          value={richTextValue}
          onChange={(nextValue) => onChange(nextValue)}
          output="json"
          placeholder={field.placeholder ?? field.description}
          className="w-full"
          editorContentClassName="min-h-[220px] p-4"
          editorClassName="focus:outline-hidden"
          editable
        />
      ) : field.type === "textarea" ? (
        <Textarea
          id={field.key}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? field.description}
          rows={3}
        />
      ) : field.type === "boolean" ? (
        <Switch
          checked={stringValue === "true"}
          defaultChecked={field.defaultValue === "true"}
          onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
        />
      ) : (
        <Input
          id={field.key}
          type={
            field.type === "url"
              ? "url"
              : field.type === "color"
                ? "color"
                : field.type === "number"
                  ? "number"
                  : "text"
          }
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? field.description}
        />
      )}

      {/* Don't show description for media types (already in component) */}
      {field.type !== "image" && field.type !== "video" && (
        <p className="text-xs text-gray-500">{field.description}</p>
      )}
    </div>
  );
}

// Gallery Field Select Component
function GalleryFieldSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { data: galleries } = api.gallery.list.useQuery();

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select a gallery..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None</SelectItem>
        {galleries?.map((gallery) => (
          <SelectItem key={gallery.id} value={gallery.id}>
            {gallery.name} ({gallery._count.images} images)
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Collection Field Select Component
function CollectionFieldSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { data: collections } = api.collections.getAll.useQuery();

  return (
    <Select
      value={value || "none"}
      onValueChange={(v) => onChange(v === "none" ? "" : v)}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select a collection..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None (use featured products)</SelectItem>
        {collections?.map((collection) => (
          <SelectItem key={collection.id} value={collection.id}>
            {collection.name} ({collection._count.collectionProducts} products)
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Custom Fields Section Component
// function CustomFieldsSection({
//   page,
//   customPairs,
//   allCustomPairs,
//   onAdd,
//   onUpdate,
//   onDelete,
// }: {
//   page: string;
//   customPairs: { key: string; value: string; page: string }[];
//   allCustomPairs: { key: string; value: string; page: string }[];
//   onAdd: () => void;
//   onUpdate: (
//     index: number,
//     field: "key" | "value" | "page",
//     value: string,
//   ) => void;
//   onDelete: (index: number) => void;
// }) {
//   return (
//     <div>
//       <div className="mb-4 flex items-center justify-between">
//         <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
//           Custom Fields
//           {customPairs.length > 0 && (
//             <Badge variant="outline">{customPairs.length}</Badge>
//           )}
//         </h3>
//         <Button onClick={onAdd} size="sm" variant="outline">
//           <Plus className="mr-2 h-4 w-4" />
//           Add Custom Field
//         </Button>
//       </div>

//       {customPairs.length === 0 ? (
//         <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
//           <p className="mb-3 text-sm text-gray-500">
//             No custom fields for this page yet
//           </p>
//           <Button onClick={onAdd} size="sm" variant="outline">
//             <Plus className="mr-2 h-4 w-4" />
//             Add First Custom Field
//           </Button>
//         </div>
//       ) : (
//         <div className="space-y-4">
//           {customPairs.map((pair, index) => {
//             const globalIndex = allCustomPairs.indexOf(pair);
//             return (
//               <Card key={index}>
//                 <CardContent className="pt-6">
//                   <div className="flex items-start gap-4">
//                     <div className="grid flex-1 grid-cols-2 gap-4">
//                       <div>
//                         <Label className="text-xs text-gray-500 uppercase">
//                           Key
//                         </Label>
//                         <Input
//                           value={pair.key}
//                           onChange={(e) =>
//                             onUpdate(globalIndex, "key", e.target.value)
//                           }
//                           placeholder={`${page}.custom.field`}
//                           className="mt-1 font-mono text-sm"
//                         />
//                       </div>

//                       <div>
//                         <Label className="text-xs text-gray-500 uppercase">
//                           Value
//                         </Label>
//                         <Input
//                           value={pair.value}
//                           onChange={(e) =>
//                             onUpdate(globalIndex, "value", e.target.value)
//                           }
//                           placeholder="Field value"
//                           className="mt-1"
//                         />
//                       </div>
//                     </div>

//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       onClick={() => onDelete(globalIndex)}
//                       className="mt-6"
//                     >
//                       <Trash2 className="h-4 w-4 text-red-600" />
//                     </Button>
//                   </div>
//                 </CardContent>
//               </Card>
//             );
//           })}
//         </div>
//       )}
//     </div>
//   );
// }

type TemplateImageUploadFieldProps = {
  value: string; // Current image URL from customFields
  onChange: (url: string) => void; // Update customFields
  label?: string;
  description?: string;
  disabled?: boolean;
};

function isImageFile(file: File): boolean {
  return (
    file.type.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(file.name)
  );
}

function isVideoFile(file: File): boolean {
  return (
    file.type.startsWith("video/") ||
    /\.(mp4|mov|webm|ogg|avi|m4v|3gp|mkv)$/i.test(file.name)
  );
}

export function TemplateImageUploadField({
  value,
  onChange,
  label,
  description,
  disabled,
}: TemplateImageUploadFieldProps) {
  const [localFile, setLocalFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Better-upload hook
  const uploader = useUploadFile({
    api: "/api/upload",
    route: "image", // Same route as your existing uploads
    onError: (error) => {
      toast.error(error.message ?? "Image upload failed");
      setLocalFile(null);
    },
  });

  // Object URL for preview of selected file
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!localFile || !isImageFile(localFile)) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(localFile);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [localFile]);

  // Preview URL: object URL (new file) or existing value
  const previewUrl = objectUrl ?? (value && !localFile ? value : null);
  const hasFile = localFile instanceof File;

  const triggerFileInput = useCallback(() => {
    if (disabled || uploader.isPending) return;
    fileInputRef.current?.click();
  }, [disabled, uploader.isPending]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!isImageFile(file)) {
        toast.error("Please select a valid image file");
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }

      setLocalFile(file);

      // Upload immediately
      try {
        const response = await uploader.upload(file);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";

        if (fileLocation) {
          // Update parent with uploaded URL
          onChange(fileLocation);
          toast.success("Image uploaded successfully");
          setLocalFile(null); // Clear local file after upload
        }
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload image");
        setLocalFile(null);
      }
    },
    [onChange, uploader],
  );

  const handleRemove = useCallback(() => {
    onChange(""); // Clear value
    setLocalFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onChange]);

  const isUploading = uploader.isPending;

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}

      <div className="space-y-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled ?? isUploading}
          aria-label={label ?? "Choose image file"}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void handleFileSelect(file);
            }
            e.target.value = "";
          }}
        />

        {/* Preview */}
        {previewUrl ? (
          <div className="bg-muted flex items-center gap-3 rounded-lg border p-3">
            <img
              src={previewUrl}
              alt={hasFile ? localFile.name : "Preview"}
              className="h-16 w-16 shrink-0 rounded-md object-cover"
            />
            <div className="min-w-0 flex-1">
              {hasFile && (
                <p className="truncate text-sm font-medium">{localFile.name}</p>
              )}
              <p className="text-muted-foreground text-xs">
                {isUploading
                  ? "Uploading..."
                  : hasFile
                    ? "Uploading..."
                    : "Current image"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled ?? isUploading}
              aria-label="Remove image"
              className="text-muted-foreground hover:text-destructive shrink-0"
              onClick={handleRemove}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        {/* Upload button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled ?? isUploading}
          onClick={triggerFileInput}
          className="w-full"
        >
          {isUploading ? (
            <>
              <span className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {previewUrl ? "Replace image" : "Choose image"}
            </>
          )}
        </Button>

        {/* Drag & drop area */}
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              triggerFileInput();
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (disabled || isUploading) return;
            const file = e.dataTransfer.files?.[0];
            if (file && isImageFile(file)) {
              void handleFileSelect(file);
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "border-muted-foreground/25 rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors",
            "hover:border-muted-foreground/50 hover:bg-muted/50",
            (disabled ?? isUploading) && "pointer-events-none opacity-50",
          )}
          onClick={triggerFileInput}
        >
          Drag and drop an image here, or click to browse
        </div>
      </div>

      {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
  );
}

type TemplateVideoUploadFieldProps = {
  value: string; // Current video URL from customFields
  onChange: (url: string) => void; // Update customFields
  label?: string;
  description?: string;
  disabled?: boolean;
};

export function TemplateVideoUploadField({
  value,
  onChange,
  label,
  description,
  disabled,
}: TemplateVideoUploadFieldProps) {
  const [localFile, setLocalFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploader = useUploadFile({
    api: "/api/upload",
    route: "video",
    onError: (error) => {
      toast.error(error.message ?? "Video upload failed");
      setLocalFile(null);
    },
  });

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!localFile || !isVideoFile(localFile)) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(localFile);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [localFile]);

  const previewUrl = objectUrl ?? (value && !localFile ? value : null);
  const hasFile = localFile instanceof File;

  const triggerFileInput = useCallback(() => {
    if (disabled || uploader.isPending) return;
    fileInputRef.current?.click();
  }, [disabled, uploader.isPending]);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!isVideoFile(file)) {
        toast.error("Please select a valid video file");
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        toast.error("Video must be less than 50MB");
        return;
      }

      setLocalFile(file);

      try {
        const response = await uploader.upload(file);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";

        if (fileLocation) {
          onChange(fileLocation);
          toast.success("Video uploaded successfully");
          setLocalFile(null);
        }
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Failed to upload video");
        setLocalFile(null);
      }
    },
    [onChange, uploader],
  );

  const handleRemove = useCallback(() => {
    onChange("");
    setLocalFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onChange]);

  const isUploading = uploader.isPending;

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          disabled={disabled ?? isUploading}
          aria-label={label ?? "Choose video file"}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              void handleFileSelect(file);
            }
            e.target.value = "";
          }}
        />

        {previewUrl ? (
          <div className="bg-muted flex items-center gap-3 rounded-lg border p-3">
            <video
              src={previewUrl}
              controls
              muted
              className="h-16 w-24 shrink-0 rounded-md bg-black object-cover"
            >
              Your browser does not support the video tag.
            </video>
            <div className="min-w-0 flex-1">
              {hasFile && (
                <p className="truncate text-sm font-medium">{localFile.name}</p>
              )}
              <p className="text-muted-foreground text-xs">
                {isUploading
                  ? "Uploading..."
                  : hasFile
                    ? "Uploading..."
                    : "Current video"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled ?? isUploading}
              aria-label="Remove video"
              className="text-muted-foreground hover:text-destructive shrink-0"
              onClick={handleRemove}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled ?? isUploading}
          onClick={triggerFileInput}
          className="w-full"
        >
          {isUploading ? (
            <>
              <span className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {previewUrl ? "Replace video" : "Choose video"}
            </>
          )}
        </Button>

        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              triggerFileInput();
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (disabled || isUploading) return;
            const file = e.dataTransfer.files?.[0];
            if (file && isVideoFile(file)) {
              void handleFileSelect(file);
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          className={cn(
            "border-muted-foreground/25 rounded-lg border-2 border-dashed p-4 text-center text-sm transition-colors",
            "hover:border-muted-foreground/50 hover:bg-muted/50",
            (disabled ?? isUploading) && "pointer-events-none opacity-50",
          )}
          onClick={triggerFileInput}
        >
          Drag and drop a video here, or click to browse (max 20MB)
        </div>
      </div>
      {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
  );
}
