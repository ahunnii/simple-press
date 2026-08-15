"use client";

import type { ReactNode } from "react";
import type { FieldErrors } from "react-hook-form";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@better-upload/client";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ExternalLink,
  Info,
  Save,
  TriangleAlert,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

import type {
  PageMetaEntry,
  StaticSeoRoute,
  StaticSeoRouteKey,
} from "~/lib/validators/site-seo";
import { env } from "~/env";
import { cn } from "~/lib/utils";
import {
  normalizeVerificationToken,
  parsePageMeta,
  parseSiteVerification,
  STATIC_SEO_ROUTES,
} from "~/lib/validators/site-seo";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Form } from "~/components/ui/form";
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ImageUploadFormField } from "~/components/inputs/image-upload-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { SwitchFormField } from "~/components/inputs/switch-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";
import {
  SearchResultPreview,
  SocialPreviewCard,
} from "~/components/admin/seo-previews";
import {
  erroredTabsFor,
  TabErrorDot,
} from "~/app/admin/_components/form-tab-errors";

type Props = {
  business: {
    id: string;
    name: string;
    subdomain: string;
    customDomain: string | null;
    /** `BusinessDomainStatus` — only `"ACTIVE"` means the custom domain resolves. */
    domainStatus: string;
    localBusinessEnabled: boolean;
    allowAiCrawlers: boolean;
  };
  siteContent: {
    metaTitle: string | null;
    metaDescription: string | null;
    metaKeywords: string | null;
    ogImage: string | null;
    faviconUrl: string | null;
    // Raw Json columns — always read through `parsePageMeta` /
    // `parseSiteVerification`, never trusted as already-shaped.
    pageMeta: unknown;
    siteVerification: unknown;
  };
  /**
   * Route keys from `STATIC_SEO_ROUTES` whose feature flag is on for this
   * business. Resolved on the server (`getBusinessFlags`) and passed down as a
   * plain array because `isEnabled` is a function and cannot cross the
   * server/client boundary. Routes not in this list are not rendered — offering
   * to tune the SEO of a page the owner has switched off would be nonsense —
   * but any values they already hold still round-trip through the form.
   */
  enabledRouteKeys: StaticSeoRouteKey[];
  /**
   * The search-readiness report, rendered by the server page and handed over as
   * an already-built element (a server component may be passed as a prop to a
   * client component).
   *
   * It is deliberately NOT rendered inside the `<form>` below: its accordion
   * triggers are `<button>`s with no explicit `type`, which default to
   * `type="submit"` and would save the whole SEO form on every expand. It sits
   * between the sticky toolbar and the form instead, so the page reads
   * top-to-bottom: what to save → how you're doing → what to change.
   */
  scorecard: ReactNode;
};

// One editable row of `SiteContent.pageMeta`. Strings rather than optionals so
// every input is controlled from first render and the counters never have to
// deal with `undefined`; the empties are stripped again on submit.
const pageMetaRowSchema = z.object({
  title: z.string(),
  description: z.string(),
  // Not edited on this page (per-route image upload is a separate job), but
  // carried through the form so a value set elsewhere survives a save here.
  ogImage: z.string(),
});

// Written out key-by-key rather than as `z.record(...)`: a record widens
// react-hook-form's `Path<>` to bare `string`, which would silently disable
// typo-checking on every other field name in this form. The `satisfies` clause
// makes a route added to (or removed from) STATIC_SEO_ROUTES a type error here
// instead of a silently unreachable field.
const pageMetaShape = {
  about: pageMetaRowSchema,
  contact: pageMetaRowSchema,
  shop: pageMetaRowSchema,
  blog: pageMetaRowSchema,
  collections: pageMetaRowSchema,
  services: pageMetaRowSchema,
  testimonials: pageMetaRowSchema,
  faq: pageMetaRowSchema,
  events: pageMetaRowSchema,
  videos: pageMetaRowSchema,
} satisfies Record<StaticSeoRouteKey, typeof pageMetaRowSchema>;

// Favicon upload/persistence already has a complete, working home on the
// Branding page (branding-editor.tsx → content.updateSiteContent →
// siteContent.faviconUrl). business.updateSeo (the mutation this form uses)
// never accepted or wrote faviconUrl, so a faviconFile/faviconUrl field here
// was dead form state that was never rendered or submitted — removed rather
// than wired up, to avoid two divergent code paths writing the same field.
const seoFormSchema = z.object({
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  metaKeywords: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  ogImageFile: z.instanceof(File).optional().nullable(),
  localBusinessEnabled: z.boolean(),
  allowAiCrawlers: z.boolean(),
  pageMeta: z.object(pageMetaShape),
  siteVerification: z.object({
    google: z.string(),
    bing: z.string(),
  }),
});

type SeoFormValues = z.infer<typeof seoFormSchema>;

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 160;

/**
 * The `<form>` renders *below* the sticky toolbar rather than around it, so the
 * scorecard can sit between the two without its buttons submitting. The Save
 * button reaches the form by id instead of by containment.
 */
const FORM_ID = "seo-settings-form";

const GOOGLE_SEARCH_CONSOLE_URL = "https://search.google.com/search-console";
const BING_WEBMASTER_URL = "https://www.bing.com/webmasters";

/** Stand-in shown in the previews when nothing has been written yet. */
const NO_DESCRIPTION =
  "No description yet — search engines will pick their own wording.";

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type SeoTab = "store" | "pages" | "search";

/**
 * Which tab each form field lives on.
 *
 * Load-bearing: one Save now spans three tabs, and a field that fails
 * validation on a tab the owner cannot see would otherwise produce a failed
 * save with nothing on screen to explain it. `erroredTabsFor` walks this map to
 * raise a dot on the offending trigger, and an invalid submit switches to it.
 *
 * The `satisfies` clause keeps the map exhaustive: a field added to
 * `seoFormSchema` without a home here is a type error rather than a silently
 * un-flagged one.
 */
const TAB_FOR_FIELD = {
  metaTitle: "store",
  metaDescription: "store",
  metaKeywords: "store",
  ogImage: "store",
  ogImageFile: "store",
  pageMeta: "pages",
  siteVerification: "search",
  localBusinessEnabled: "search",
  allowAiCrawlers: "search",
} satisfies Record<keyof SeoFormValues, SeoTab>;

/** Map a field path (`pageMeta.shop.title`) to the tab that renders it. */
function tabForField(name: string): SeoTab {
  const root = name.split(".")[0] ?? name;
  return root in TAB_FOR_FIELD
    ? TAB_FOR_FIELD[root as keyof typeof TAB_FOR_FIELD]
    : "store";
}

const ROUTE_KEYS = new Set<string>(STATIC_SEO_ROUTES.map((route) => route.key));

/** Narrow an accordion item value (a bare string) back to a route key. */
function asRouteKey(value: string | undefined): StaticSeoRouteKey | null {
  if (value === undefined || !ROUTE_KEYS.has(value)) return null;
  return value as StaticSeoRouteKey;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * First candidate that actually has text in it, else `fallback`.
 *
 * `??` is the wrong operator here: every string field in this form defaults to
 * `""`, which is not nullish, so a cleared field would win over the value it is
 * supposed to fall through to — and the whole point of the previews is to show
 * what a *blank* field inherits. A coalescing ternary says this correctly but
 * trips `prefer-nullish-coalescing`, which this repo enforces as an error.
 * Same shape and reasoning as `resolveLogoAlt` in `~/lib/logo-alt`.
 */
function firstFilled(
  candidates: (string | null | undefined)[],
  fallback: string,
): string {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed !== undefined && trimmed.length > 0) return trimmed;
  }
  return fallback;
}

/**
 * The address the storefront actually answers on today — the same resolution
 * order as `getBusinessUrl`, minus the protocol. A custom domain only counts
 * once its DNS check has passed; until then the store is still served from the
 * subdomain, and telling the owner to verify an address that does not resolve
 * yet would waste their afternoon in Search Console.
 */
function resolveStoreHost(business: Props["business"]): string {
  if (process.env.NODE_ENV === "development") {
    return `${business.subdomain}.localhost:3000`;
  }
  const customDomain = business.customDomain?.trim();
  if (
    business.domainStatus === "ACTIVE" &&
    customDomain !== undefined &&
    customDomain.length > 0
  ) {
    return customDomain;
  }
  return `${business.subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`;
}

/**
 * Build the full set of form values from the persisted row. Used for
 * `defaultValues`, for Reset, and for the post-save `form.reset` so all three
 * can never drift apart.
 */
function buildFormValues(args: {
  siteContent: {
    metaTitle: string | null | undefined;
    metaDescription: string | null | undefined;
    metaKeywords: string | null | undefined;
    ogImage: string | null | undefined;
    pageMeta: unknown;
    siteVerification: unknown;
  };
  localBusinessEnabled: boolean;
  allowAiCrawlers: boolean;
}): SeoFormValues {
  const storedPageMeta = parsePageMeta(args.siteContent.pageMeta);
  const storedVerification = parseSiteVerification(
    args.siteContent.siteVerification,
  );

  const pageMeta: Record<string, z.infer<typeof pageMetaRowSchema>> = {};
  for (const route of STATIC_SEO_ROUTES) {
    const entry: PageMetaEntry = storedPageMeta[route.key] ?? {};
    pageMeta[route.key] = {
      title: entry.title ?? "",
      description: entry.description ?? "",
      ogImage: entry.ogImage ?? "",
    };
  }

  return {
    metaTitle: args.siteContent.metaTitle ?? "",
    metaDescription: args.siteContent.metaDescription ?? "",
    metaKeywords: args.siteContent.metaKeywords ?? "",
    ogImage: args.siteContent.ogImage ?? "",
    ogImageFile: null,
    localBusinessEnabled: args.localBusinessEnabled,
    allowAiCrawlers: args.allowAiCrawlers,
    // Safe by construction: the loop above walks STATIC_SEO_ROUTES, and
    // `pageMetaShape` is pinned to that same key set by its `satisfies` clause.
    pageMeta: pageMeta as SeoFormValues["pageMeta"],
    siteVerification: {
      google: storedVerification.google ?? "",
      bing: storedVerification.bing ?? "",
    },
  };
}

/** Live counter that turns destructive once the value runs past the cap. */
function CharCount({
  length,
  max,
  optimal,
  hint,
}: {
  length: number;
  max: number;
  optimal: string;
  hint?: string;
}) {
  return (
    <span className={cn(length > max && "text-destructive")}>
      {length}/{max} characters (optimal: {optimal})
      {hint === undefined ? null : ` — ${hint}`}
    </span>
  );
}

/** Short "what has the owner filled in here" label for the accordion header. */
function rowStatus(row: { title: string; description: string }) {
  const hasTitle = row.title.trim().length > 0;
  const hasDescription = row.description.trim().length > 0;
  if (hasTitle && hasDescription) return "Title + description";
  if (hasTitle) return "Title only";
  if (hasDescription) return "Description only";
  return "Inheriting store defaults";
}

/** Opens in a new tab, because the owner is mid-task in this form. */
function StepLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-foreground hover:text-primary focus-visible:outline-ring inline-flex items-center gap-1 font-medium underline underline-offset-4 transition-colors duration-150 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {children}
      <ExternalLink className="size-3.5" aria-hidden="true" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** Inline chip for a literal the owner has to copy or recognise on screen. */
function Literal({ children }: { children: ReactNode }) {
  return (
    <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs break-all">
      {children}
    </code>
  );
}

export function SEOEditor({
  business,
  siteContent,
  enabledRouteKeys,
  scorecard,
}: Props) {
  const router = useRouter();

  // Refs
  const ogImageFileInputRef = useRef<HTMLInputElement | null>(null);

  const savedValues = buildFormValues({
    siteContent,
    localBusinessEnabled: business.localBusinessEnabled,
    allowAiCrawlers: business.allowAiCrawlers,
  });

  // Form Setup
  const form = useForm<SeoFormValues>({
    resolver: zodResolver(seoFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: savedValues,
  });

  const [activeTab, setActiveTab] = useState<SeoTab>("store");

  // Which per-page rows start expanded. Read once on mount: re-deriving it from
  // watched state would yank a row open the moment the owner typed the first
  // character into it.
  const [initiallyOpenRoutes] = useState<string[]>(() =>
    STATIC_SEO_ROUTES.filter((route) => {
      const row = savedValues.pageMeta[route.key];
      return row.title.length > 0 || row.description.length > 0;
    }).map((route) => route.key),
  );

  // The accordion is controlled now, because the pinned previews follow it.
  const [openRoutes, setOpenRoutes] = useState<string[]>(initiallyOpenRoutes);
  const [focusedRouteKey, setFocusedRouteKey] =
    useState<StaticSeoRouteKey | null>(() =>
      asRouteKey(initiallyOpenRoutes[0]),
    );

  /**
   * Keep one route "in focus" for the previews while still allowing several
   * rows to stay open at once. Opening a row always takes focus; closing one
   * only moves focus if it was the focused row, and then to whatever is still
   * open — falling back to the store defaults when nothing is.
   */
  const handleAccordionChange = (next: string[]) => {
    const opened = next.find((key) => !openRoutes.includes(key));
    setOpenRoutes(next);

    if (opened !== undefined) {
      setFocusedRouteKey(asRouteKey(opened));
      return;
    }

    setFocusedRouteKey((current) => {
      if (current !== null && next.includes(current)) return current;
      return asRouteKey(next[next.length - 1]);
    });
  };

  //Image Uploads
  const ogImageUploader = useUploadFile({
    api: "/api/upload",
    route: "image",
    onError: (error) => {
      toast.error(error.message ?? "Open Graph Image upload failed.");
    },
  });

  //Mutations
  const updateSiteContent = api.business.updateSeo.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success("SEO settings updated");
      form.reset(
        buildFormValues({
          siteContent: {
            metaTitle: data.siteContent?.metaTitle,
            metaDescription: data.siteContent?.metaDescription,
            metaKeywords: data.siteContent?.metaKeywords,
            ogImage: data.siteContent?.ogImage,
            pageMeta: data.siteContent?.pageMeta,
            siteVerification: data.siteContent?.siteVerification,
          },
          localBusinessEnabled: data.localBusinessEnabled,
          allowAiCrawlers: data.allowAiCrawlers,
        }),
      );
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message || "Failed to update SEO settings");
    },
    onSettled: () => {
      router.refresh();
    },
    onMutate: () => {
      toast.loading("Updating SEO settings...");
    },
  });

  //Handlers
  const handleReset = () => {
    form.reset(savedValues);
    if (ogImageFileInputRef.current) ogImageFileInputRef.current.value = "";
  };

  /** Pull the bare token out of a pasted `<meta …>` tag, in place. */
  const normalizeVerificationField = (
    name: "siteVerification.google" | "siteVerification.bing",
    raw: string,
  ) => {
    const normalized = normalizeVerificationToken(raw);
    // Guard the write: an unconditional `setValue(..., shouldDirty: true)` on
    // every blur would mark the form dirty just for tabbing through the field.
    if (normalized === raw) return;
    form.setValue(name, normalized, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  /** A save that never reached the server: surface the tab holding the error. */
  const handleInvalidSubmit = (errors: FieldErrors<SeoFormValues>) => {
    const first = Object.keys(errors)[0];
    if (first !== undefined) setActiveTab(tabForField(first));
  };

  const handleSubmit = async (data: SeoFormValues) => {
    let ogImageUrl: string | undefined = siteContent.ogImage ?? undefined;

    const tempOgImageFile = data.ogImageFile;
    if (tempOgImageFile instanceof File) {
      try {
        const response = await ogImageUploader.upload(tempOgImageFile);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";
        if (fileLocation) ogImageUrl = fileLocation;
      } catch {
        toast.error("Failed to upload image.");
        return;
      }
    }

    // Rebuilt from the WHOLE form, not just the rows the owner touched: the
    // mutation replaces the column outright, so a partial payload would wipe
    // every route the owner did not open this session. Feature-gated rows are
    // included too — they are still in form state even though no input for them
    // was rendered — so turning a feature off and saving does not discard the
    // metadata it had. The same holds for rows on a tab that was never opened:
    // react-hook-form keeps unmounted field values (`shouldUnregister` is off),
    // so this loop still sees every route.
    const pageMeta: Record<string, PageMetaEntry> = {};
    for (const route of STATIC_SEO_ROUTES) {
      const row = data.pageMeta[route.key];
      const entry: PageMetaEntry = {};

      const title = row.title.trim();
      if (title.length > 0) entry.title = title;

      const description = row.description.trim();
      if (description.length > 0) entry.description = description;

      // Untouched by this editor — echoed straight back so a per-route social
      // image set elsewhere is not silently dropped on save.
      const routeOgImage = row.ogImage.trim();
      if (routeOgImage.length > 0) entry.ogImage = routeOgImage;

      if (Object.keys(entry).length > 0) pageMeta[route.key] = entry;
    }

    // Normalize once more at submit time: a paste followed immediately by
    // ⌘/Ctrl+Enter never fires the blur handler.
    const google = normalizeVerificationToken(data.siteVerification.google);
    const bing = normalizeVerificationToken(data.siteVerification.bing);

    updateSiteContent.mutate({
      metaTitle: data.metaTitle ?? undefined,
      metaDescription: data.metaDescription ?? undefined,
      metaKeywords: data.metaKeywords ?? undefined,
      ogImage: ogImageUrl,
      localBusinessEnabled: data.localBusinessEnabled,
      allowAiCrawlers: data.allowAiCrawlers,
      pageMeta,
      siteVerification: {
        ...(google.length > 0 && { google }),
        ...(bing.length > 0 && { bing }),
      },
    });
  };

  // Checks and Hooks
  const isDirty = form.formState.isDirty;
  const isSaving = updateSiteContent.isPending;

  const { errors: formErrors, isSubmitted: saveAttempted } = form.formState;
  const erroredTabs = useMemo(
    () =>
      saveAttempted
        ? erroredTabsFor(formErrors, tabForField)
        : new Set<SeoTab>(),
    [saveAttempted, formErrors],
  );

  const storeHost = resolveStoreHost(business);
  // A custom domain the owner has entered but whose DNS has not checked out
  // yet. Empty string means "nothing pending", which is why the emptiness test
  // below is explicit rather than a nullish check.
  const enteredCustomDomain = firstFilled([business.customDomain], "");
  const pendingCustomDomain =
    business.domainStatus === "ACTIVE" ? "" : enteredCustomDomain;

  // Watched here (not inline in the JSX) so the fallbacks can test emptiness
  // explicitly — the form defaults these to "", which is not nullish, so `??`
  // never falls through and `||` trips the lint rule.
  const storeTitle = form.watch("metaTitle");
  const storeDescription = form.watch("metaDescription");
  const storeTitleLength = storeTitle?.length ?? 0;
  const storeDescriptionLength = storeDescription?.length ?? 0;
  const inheritedDescription = firstFilled([storeDescription], "");
  const watchedOgImageFile = form.watch("ogImageFile");

  // Per-page rows: only routes whose feature is on. A row hidden here keeps its
  // form state, so its stored values still survive the save.
  const enabled = new Set<string>(enabledRouteKeys);
  const visibleRoutes = STATIC_SEO_ROUTES.filter((route) =>
    enabled.has(route.key),
  );
  const pageMetaValues = form.watch("pageMeta");

  // ─── Pinned previews ───────────────────────────────────────────────────────
  // On the per-page tab they follow whichever row is open; everywhere else they
  // show the store-wide defaults. That linkage is the whole reason the previews
  // are pinned rather than parked at the bottom of one tab.
  const previewRoute: StaticSeoRoute | undefined =
    activeTab === "pages" && focusedRouteKey !== null
      ? visibleRoutes.find((route) => route.key === focusedRouteKey)
      : undefined;
  const previewRow =
    previewRoute === undefined ? undefined : pageMetaValues[previewRoute.key];

  // Mirrors `buildPageMetadata`: an owner-written per-page title ships verbatim,
  // a blank one inherits the built-in page name plus the "| Store" suffix from
  // the root layout's title template.
  const previewTitle =
    previewRoute === undefined
      ? firstFilled([storeTitle], business.name)
      : firstFilled(
          [previewRow?.title],
          `${previewRoute.label} | ${business.name}`,
        );

  const previewDescription =
    previewRoute === undefined
      ? firstFilled([storeDescription], NO_DESCRIPTION)
      : firstFilled(
          [previewRow?.description, storeDescription],
          NO_DESCRIPTION,
        );

  const previewSlug =
    previewRoute === undefined ? "" : previewRoute.path.replace(/^\//, "");

  // A per-route share image (set elsewhere, echoed through this form) beats the
  // store-wide one for that route — same order as `buildPageMetadata`.
  const routeOgImage = firstFilled([previewRow?.ogImage], "");
  const usesRouteOgImage = routeOgImage.length > 0;

  useKeyboardEnter(form, handleSubmit, handleInvalidSubmit);
  useDirtyForm(isDirty);

  return (
    <Form {...form}>
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
              <h1 className="text-base font-medium">SEO &amp; Meta</h1>

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
              onClick={handleReset}
              className="hidden md:inline-flex"
            >
              Reset
            </Button>

            {/* Outside the <form> now (the scorecard sits between them), so the
                submit button reaches it by id rather than by containment. */}
            <Button type="submit" form={FORM_ID} size="sm" disabled={isSaving}>
              {isSaving ? (
                <>
                  <span className="saving-indicator" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Save changes</span>
                  <span className="sm:hidden">Save</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="admin-container space-y-6">
          {scorecard}

          <form
            id={FORM_ID}
            onSubmit={(e) =>
              void form.handleSubmit(handleSubmit, handleInvalidSubmit)(e)
            }
          >
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as SeoTab)}
              className="w-full"
            >
              <TabsList>
                <TabsTrigger value="store">
                  Your store
                  {erroredTabs.has("store") && <TabErrorDot />}
                </TabsTrigger>
                <TabsTrigger value="pages">
                  Individual pages
                  {erroredTabs.has("pages") && <TabErrorDot />}
                </TabsTrigger>
                <TabsTrigger value="search">
                  Search engines
                  {erroredTabs.has("search") && <TabErrorDot />}
                </TabsTrigger>
              </TabsList>

              <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="min-w-0">
                  {/* ─── Your store ─────────────────────────────────────── */}
                  {/* Radix gives each panel `tabIndex={0}`, and the shared
                      `TabsContent` zeroes the outline — so the ring is put back
                      here, where the panel is actually a keyboard stop. */}
                  <TabsContent
                    value="store"
                    className="focus-visible:ring-ring/50 mt-0 space-y-6 rounded-md focus-visible:ring-[3px]"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Your store&apos;s default wording</CardTitle>
                        <CardDescription>
                          The title and description search engines show for your
                          store. Used on every page that doesn&apos;t set its
                          own — so this is the one to write first. Any page that
                          does set its own replaces this rather than adding to
                          it; the two never appear together.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <InputFormField
                          form={form}
                          name="metaTitle"
                          label="Store title"
                          placeholder={business.name}
                          description={
                            <CharCount
                              length={storeTitleLength}
                              max={TITLE_LIMIT}
                              optimal="50-60"
                              hint={`leave blank to use “${business.name}”`}
                            />
                          }
                          descriptionClassName="text-xs text-muted-foreground"
                        />

                        <TextareaFormField
                          form={form}
                          name="metaDescription"
                          label="Store description"
                          rows={3}
                          placeholder="A sentence or two about what you sell and who it's for."
                          description={
                            <CharCount
                              length={storeDescriptionLength}
                              max={DESCRIPTION_LIMIT}
                              optimal="150-160"
                              hint="the grey text under your link in search results"
                            />
                          }
                          descriptionClassName="text-xs text-muted-foreground"
                        />

                        <InputFormField
                          form={form}
                          name="metaKeywords"
                          label="Keywords"
                          placeholder="handmade pottery, stoneware mugs, ceramics"
                          description="Comma-separated words people might search for. Google ignores these; some smaller search engines still read them, so they're optional."
                          descriptionClassName="text-xs text-muted-foreground"
                        />

                        <p className="text-muted-foreground border-t pt-4 text-sm">
                          Want a different title on one page only?{" "}
                          <Button
                            type="button"
                            variant="link"
                            className="h-auto p-0 text-sm"
                            onClick={() => setActiveTab("pages")}
                          >
                            Set it under Individual pages
                          </Button>
                          .
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Share image</CardTitle>
                        <CardDescription>
                          The picture that appears when someone pastes a link to
                          your store into Facebook, LinkedIn, Slack, iMessage or
                          X. Without one, those apps show a plain grey box. 1200
                          × 630 pixels is the size everything crops to.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ImageUploadFormField
                          form={form}
                          name="ogImageFile"
                          label="Image"
                          description="Uploaded when you save, not when you choose it."
                          existingPreviewUrl={siteContent.ogImage ?? undefined}
                          inputRef={ogImageFileInputRef}
                          disabled={isSaving}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* ─── Individual pages ───────────────────────────────── */}
                  {/* No Card here on purpose: the tab panel is already the
                      container, and a ruled list reads better than a card
                      wrapped around ten more rows. */}
                  <TabsContent
                    value="pages"
                    className="focus-visible:ring-ring/50 mt-0 space-y-4 rounded-md focus-visible:ring-[3px]"
                  >
                    <div className="space-y-1.5">
                      <h2 className="text-foreground text-base font-semibold">
                        Wording for one page at a time
                      </h2>
                      <p className="text-muted-foreground max-w-2xl text-sm">
                        Anything you write here{" "}
                        <span className="text-foreground font-medium">
                          overrides your store defaults for this page only
                        </span>{" "}
                        — it replaces them rather than being added to them.
                        Leave a box blank and the page keeps what it shows
                        today, which is what the grey placeholder text says.{" "}
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-sm"
                          onClick={() => setActiveTab("store")}
                        >
                          Edit the store defaults
                        </Button>
                        .
                      </p>
                    </div>

                    {visibleRoutes.length === 0 ? (
                      <p className="text-muted-foreground border-t pt-4 text-sm">
                        None of these pages are switched on for your store yet.
                      </p>
                    ) : (
                      <Accordion
                        type="multiple"
                        value={openRoutes}
                        onValueChange={handleAccordionChange}
                        className="border-border/60 w-full border-t"
                      >
                        {visibleRoutes.map((route) => {
                          const row = pageMetaValues[route.key];
                          const isCustomized =
                            row.title.trim().length > 0 ||
                            row.description.trim().length > 0;

                          return (
                            <AccordionItem key={route.key} value={route.key}>
                              {/* `hover:no-underline` + a scoped `group-hover`
                                  keeps the hover affordance on the page name and
                                  off the path and the status badge — a decoration
                                  set on the button itself draws straight through
                                  every descendant. */}
                              <AccordionTrigger className="group hover:no-underline">
                                <span className="flex flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-1 pr-2">
                                  <span className="flex items-baseline gap-2">
                                    <span className="group-hover:underline">
                                      {route.label}
                                    </span>
                                    <span className="text-muted-foreground text-xs font-normal">
                                      {route.path}
                                    </span>
                                  </span>
                                  <Badge
                                    variant={
                                      isCustomized ? "secondary" : "outline"
                                    }
                                    className="shrink-0 font-normal"
                                  >
                                    {rowStatus(row)}
                                  </Badge>
                                </span>
                              </AccordionTrigger>
                              <AccordionContent className="space-y-6 pb-6">
                                <InputFormField
                                  form={form}
                                  name={`pageMeta.${route.key}.title`}
                                  label="Page title"
                                  placeholder={`${route.label} | ${business.name}`}
                                  description={
                                    <CharCount
                                      length={row.title.length}
                                      max={TITLE_LIMIT}
                                      optimal="50-60"
                                      hint="blank keeps the page name shown above"
                                    />
                                  }
                                  descriptionClassName="text-xs text-muted-foreground"
                                />
                                <TextareaFormField
                                  form={form}
                                  name={`pageMeta.${route.key}.description`}
                                  label="Page description"
                                  rows={3}
                                  placeholder={
                                    inheritedDescription.length > 0
                                      ? inheritedDescription
                                      : "Add a store description on the Your store tab, or write one just for this page."
                                  }
                                  description={
                                    <CharCount
                                      length={row.description.length}
                                      max={DESCRIPTION_LIMIT}
                                      optimal="150-160"
                                      hint="blank inherits your store description"
                                    />
                                  }
                                  descriptionClassName="text-xs text-muted-foreground"
                                />
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    )}
                  </TabsContent>

                  {/* ─── Search engines ─────────────────────────────────── */}
                  <TabsContent
                    value="search"
                    className="focus-visible:ring-ring/50 mt-0 space-y-6 rounded-md focus-visible:ring-[3px]"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Prove you own this store</CardTitle>
                        <CardDescription>
                          Google and Bing each hand out a short code. Pasting it
                          here proves the store is yours, which unlocks their
                          free reporting tools — you get to see which searches
                          bring people to you, and which pages they land on.{" "}
                          <span className="text-foreground font-medium">
                            It does not affect where you rank.
                          </span>{" "}
                          Nothing here is required for your store to appear in
                          search; it only opens up the reports. You do it once
                          per search engine.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-8">
                        {pendingCustomDomain.length > 0 ? (
                          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                            <TriangleAlert
                              className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
                              aria-hidden="true"
                            />
                            <div className="space-y-1">
                              <p className="font-medium">
                                Finish setting up your domain first.
                              </p>
                              <p>
                                <Literal>{pendingCustomDomain}</Literal>{" "}
                                isn&apos;t answering yet, so verification for it
                                will fail. Your store is live at{" "}
                                <Literal>{storeHost}</Literal> today. Either
                                verify that address now, or wait until your own
                                domain goes live — a code verified for one
                                address does not carry over to the other, so
                                you&apos;d be doing this twice.{" "}
                                <Link
                                  href="/admin/settings/domain"
                                  className="focus-visible:outline-ring font-medium underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                                >
                                  Manage your domain
                                </Link>
                                .
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-muted-foreground flex gap-2 rounded-lg border px-3 py-2.5 text-sm">
                            <Info
                              className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0"
                              aria-hidden="true"
                            />
                            <p>
                              Your store is live at{" "}
                              <Literal>{storeHost}</Literal>, and that is the
                              exact address to verify — the code is only served
                              there. If you later move to your own domain
                              you&apos;ll need to verify again, because a code
                              verified for one address does not carry over.{" "}
                              <Link
                                href="/admin/settings/domain"
                                className="text-foreground focus-visible:outline-ring font-medium underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                              >
                                Manage your domain
                              </Link>
                              .
                            </p>
                          </div>
                        )}

                        <section className="space-y-4">
                          <h3 className="text-foreground text-sm font-semibold">
                            Google Search Console
                          </h3>
                          <ol className="text-muted-foreground marker:text-foreground/70 list-decimal space-y-2 pl-5 text-sm marker:font-medium">
                            <li>
                              Open{" "}
                              <StepLink href={GOOGLE_SEARCH_CONSOLE_URL}>
                                Google Search Console
                              </StepLink>{" "}
                              and sign in with a Google account.
                            </li>
                            <li>
                              Click{" "}
                              <span className="text-foreground font-medium">
                                Add property
                              </span>
                              , then choose the{" "}
                              <span className="text-foreground font-medium">
                                URL prefix
                              </span>{" "}
                              option (not &ldquo;Domain&rdquo;).
                            </li>
                            <li>
                              Enter your store&apos;s live address exactly:{" "}
                              <Literal>{`https://${storeHost}`}</Literal>
                            </li>
                            <li>
                              On the verification screen, expand{" "}
                              <span className="text-foreground font-medium">
                                HTML tag
                              </span>{" "}
                              — not &ldquo;HTML file&rdquo;, which needs a file
                              upload you can&apos;t do here.
                            </li>
                            <li>
                              Copy what it shows you. Pasting the whole{" "}
                              <Literal>
                                {'<meta name="google-site-verification" … />'}
                              </Literal>{" "}
                              tag is fine — we pull the code out of it for you.
                            </li>
                            <li>
                              Paste it in the box below and press{" "}
                              <span className="text-foreground font-medium">
                                Save changes
                              </span>{" "}
                              at the top of this page.
                            </li>
                            <li>
                              Go back to the Google tab and click{" "}
                              <span className="text-foreground font-medium">
                                Verify
                              </span>
                              . Reports start filling in over the next few days.
                            </li>
                          </ol>

                          <InputFormField
                            form={form}
                            name="siteVerification.google"
                            label="Google verification code"
                            placeholder="Paste the code, or the whole meta tag"
                            onBlur={(e) => {
                              normalizeVerificationField(
                                "siteVerification.google",
                                e.target.value,
                              );
                            }}
                          />
                        </section>

                        <Separator />

                        <section className="space-y-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-foreground text-sm font-semibold">
                              Bing Webmaster Tools
                            </h3>
                            <Badge variant="outline" className="font-normal">
                              Optional
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-sm">
                            Bing powers Bing, Yahoo and DuckDuckGo results, and
                            its reports work the same way as Google&apos;s. Most
                            stores get far less traffic from it, so skip this if
                            you only have time for one.
                          </p>
                          <ol className="text-muted-foreground marker:text-foreground/70 list-decimal space-y-2 pl-5 text-sm marker:font-medium">
                            <li>
                              Open{" "}
                              <StepLink href={BING_WEBMASTER_URL}>
                                Bing Webmaster Tools
                              </StepLink>{" "}
                              and add{" "}
                              <Literal>{`https://${storeHost}`}</Literal> as a
                              site.
                            </li>
                            <li>
                              Choose{" "}
                              <span className="text-foreground font-medium">
                                Add a meta tag to your homepage
                              </span>
                              , then copy the code — the whole{" "}
                              <Literal>
                                {'<meta name="msvalidate.01" … />'}
                              </Literal>{" "}
                              tag works here too.
                            </li>
                            <li>
                              Paste it below, save, then click{" "}
                              <span className="text-foreground font-medium">
                                Verify
                              </span>{" "}
                              back on Bing.
                            </li>
                          </ol>

                          <InputFormField
                            form={form}
                            name="siteVerification.bing"
                            label="Bing verification code"
                            placeholder="Paste the code, or the whole meta tag"
                            onBlur={(e) => {
                              normalizeVerificationField(
                                "siteVerification.bing",
                                e.target.value,
                              );
                            }}
                          />
                        </section>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>What crawlers may do here</CardTitle>
                        <CardDescription>
                          Two switches that change what search engines and AI
                          assistants are told about your store.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <SwitchFormField
                          form={form}
                          name="localBusinessEnabled"
                          label="Show as a local business in search & AI results"
                          description="Publishes your address and phone number in the machine-readable format search engines read, so your store can show up in local results and map panels. Turn this on only if you have a physical or local presence — an online-only store that claims one is misleading. Your address and phone number come from Settings → General."
                        />
                        <SwitchFormField
                          form={form}
                          name="allowAiCrawlers"
                          label="Allow AI answer engines to crawl this store"
                          description="Controls whether AI assistants — ChatGPT (GPTBot), Perplexity (PerplexityBot) and Google AI (Google-Extended) — may read your storefront when answering questions. Turning this off asks them to stay away. Most stores benefit from leaving it on: it is how you get mentioned in AI answers."
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </div>

                {/*
                  Pinned previews. They sit outside every `TabsContent` so they
                  stay on screen on all three tabs, and outside the left column
                  so they can stick. `overflow-y-auto` without `overscroll-contain`
                  is deliberate: on a short viewport the column scrolls its own
                  overflow and then hands the scroll back to the page, so it can
                  never swallow the wheel.
                */}
                <aside
                  aria-label="Previews"
                  className="space-y-6 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto"
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Preview</CardTitle>
                      <CardDescription>
                        {previewRoute === undefined
                          ? "Showing your store defaults."
                          : `Showing ${previewRoute.label} (${previewRoute.path}) — the row you have open.`}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <p className="text-muted-foreground text-xs font-medium">
                          In a Google result
                        </p>
                        <SearchResultPreview
                          host={storeHost}
                          pathPrefix=""
                          slug={previewSlug}
                          title={previewTitle}
                          description={previewDescription}
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-muted-foreground text-xs font-medium">
                          Shared on social
                        </p>
                        <SocialPreviewCard
                          title={previewTitle}
                          description={previewDescription}
                          ogImageFile={
                            usesRouteOgImage ? null : watchedOgImageFile
                          }
                          existingOgImage={
                            usesRouteOgImage
                              ? routeOgImage
                              : (siteContent.ogImage ?? undefined)
                          }
                          siteHost={storeHost}
                        />
                      </div>

                      <p className="text-muted-foreground text-xs">
                        An approximation. Search engines rewrite titles and
                        descriptions when they think something else fits the
                        search better.
                      </p>
                    </CardContent>
                  </Card>
                </aside>
              </div>
            </Tabs>
          </form>
        </div>
      </div>
    </Form>
  );
}
