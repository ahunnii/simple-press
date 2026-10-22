"use client";

import type { JSONContent } from "@tiptap/core";
import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Info, RotateCcw, Save, TriangleAlert } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type {
  EmailStyle,
  ResolvedEmailStyle,
} from "~/lib/marketing/email-style";
import type { RouterOutputs } from "~/trpc/react";
import {
  contrastRatio,
  EMAIL_FONT_STACKS,
  emailStyleSchema,
  resolveEmailStyle,
} from "~/lib/marketing/email-style";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";

import { EmailPreviewFrame, useCampaignPreview } from "./email-preview-frame";

type EmailStyleData = RouterOutputs["marketing"]["getEmailStyle"];

const FOOTER_NOTE_MAX = 200;
const HEX = /^#[0-9a-fA-F]{6}$/;
const HEX_MESSAGE = "Use a 6-digit hex color like #1f2937";

const formSchema = z.object({
  accent: z.string().trim().regex(HEX, HEX_MESSAGE),
  pageBackground: z.string().trim().regex(HEX, HEX_MESSAGE),
  font: z.enum(["sans", "serif"]),
  header: z.enum(["logo-center", "logo-left", "name"]),
  logoSize: z.enum(["sm", "md", "lg"]),
  showSocial: z.boolean(),
  footerNote: z
    .string()
    .max(FOOTER_NOTE_MAX, `Keep it to ${FOOTER_NOTE_MAX} characters or fewer`),
});
type FormValues = z.infer<typeof formSchema>;

const HEADER_OPTIONS = [
  { value: "logo-center", label: "Logo, centered" },
  { value: "logo-left", label: "Logo, left" },
  { value: "name", label: "Store name" },
] as const;

const LOGO_SIZE_OPTIONS = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
] as const;

const FONT_OPTIONS = [
  { value: "sans", label: "Sans" },
  { value: "serif", label: "Serif" },
] as const;

/** A sample message shown in the preview (not a real campaign). */
const SAMPLE_BODY: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Fresh arrivals are here" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Thanks for being part of our community. " },
        {
          type: "text",
          text: "Read the story behind this collection",
          marks: [{ type: "link", attrs: { href: "/" } }],
        },
        { type: "text", text: " or jump straight into the shop." },
      ],
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Shop now",
          marks: [{ type: "link", attrs: { href: "/shop", variant: "solid" } }],
        },
      ],
    },
    {
      type: "bulletList",
      content: [
        "Free local pickup on every order",
        "New items added every week",
        "Small batches, made with care",
      ].map((text) => ({
        type: "listItem",
        content: [{ type: "paragraph", content: [{ type: "text", text }] }],
      })),
    },
  ],
};

function valuesFor(style: ResolvedEmailStyle): FormValues {
  return {
    accent: style.accent,
    pageBackground: style.pageBackground,
    font: style.font,
    header: style.header,
    logoSize: style.logoSize,
    showSocial: style.showSocial,
    footerNote: style.footerNote,
  };
}

/** The saved style merged over the template defaults, as form values. */
function initialValues(initial: EmailStyleData): FormValues {
  return valuesFor(
    resolveEmailStyle({
      emailStyle: initial.saved,
      templateId: initial.templateId,
    }),
  );
}

/**
 * Form values as a style, leaving out colors that aren't a complete hex yet
 * so the preview keeps working while the owner types.
 */
function toPreviewStyle(values: FormValues): EmailStyle {
  const accent = values.accent.trim();
  const pageBackground = values.pageBackground.trim();
  return {
    ...(HEX.test(accent) ? { accent: accent.toLowerCase() } : {}),
    ...(HEX.test(pageBackground)
      ? { pageBackground: pageBackground.toLowerCase() }
      : {}),
    font: values.font,
    header: values.header,
    logoSize: values.logoSize,
    showSocial: values.showSocial,
    footerNote: values.footerNote.trim().slice(0, FOOTER_NOTE_MAX),
  };
}

function ColorField({
  form,
  name,
  label,
  description,
}: {
  form: ReturnType<typeof useForm<FormValues>>;
  name: "accent" | "pageBackground";
  label: string;
  description?: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label={`${label} picker`}
              value={
                HEX.test(field.value) ? field.value.toLowerCase() : "#000000"
              }
              onChange={(e) => field.onChange(e.target.value)}
              className="border-input h-9 w-12 shrink-0 cursor-pointer rounded-md border bg-transparent p-1"
            />
            <FormControl>
              <Input
                {...field}
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                maxLength={7}
                className="max-w-40 font-mono"
                onBlur={() => {
                  const v = field.value.trim();
                  if (/^[0-9a-fA-F]{6}$/.test(v)) field.onChange(`#${v}`);
                  field.onBlur();
                }}
              />
            </FormControl>
          </div>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function ChoiceGroup<N extends "header" | "logoSize" | "font">({
  form,
  name,
  label,
  options,
  disabled,
  description,
  renderLabel,
}: {
  form: ReturnType<typeof useForm<FormValues>>;
  name: N;
  label: string;
  options: ReadonlyArray<{ value: FormValues[N]; label: string }>;
  disabled?: boolean;
  description?: string;
  renderLabel?: (option: {
    value: FormValues[N];
    label: string;
  }) => React.ReactNode;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <RadioGroup
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
              className="grid-cols-1 gap-2 sm:grid-cols-3"
              aria-label={label}
            >
              {options.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-muted/50 flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-sm",
                    disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <RadioGroupItem value={option.value} />
                  {renderLabel ? renderLabel(option) : option.label}
                </label>
              ))}
            </RadioGroup>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function EmailStyleForm({ initial }: { initial: EmailStyleData }) {
  const router = useRouter();
  const utils = api.useUtils();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: initialValues(initial),
  });

  const save = api.marketing.saveEmailStyle.useMutation({
    onMutate: () => toast.loading("Saving email style..."),
    onSuccess: (_data, variables) => {
      toast.dismiss();
      toast.success(variables ? "Email style saved" : "Email style reset");
      void utils.marketing.getEmailStyle.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message || "Couldn't save the email style");
    },
  });

  const onSubmit = (values: FormValues) => {
    const parsed = emailStyleSchema.safeParse(toPreviewStyle(values));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your settings");
      return;
    }
    save.mutate(parsed.data, {
      onSuccess: () => form.reset(values),
    });
  };

  const onReset = () => {
    save.mutate(null, {
      onSuccess: () => {
        form.reset(
          valuesFor(
            resolveEmailStyle({
              emailStyle: null,
              templateId: initial.templateId,
            }),
          ),
        );
      },
    });
  };

  const values = form.watch();
  const previewStyle = useMemo(
    () => toPreviewStyle(values),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      values.accent,
      values.pageBackground,
      values.font,
      values.header,
      values.logoSize,
      values.showSocial,
      values.footerNote,
    ],
  );
  const resolved = useMemo(
    () =>
      resolveEmailStyle({
        emailStyle: previewStyle,
        templateId: initial.templateId,
      }),
    [previewStyle, initial.templateId],
  );

  const preview = useCampaignPreview({
    bodyJson: SAMPLE_BODY,
    previewText: "A preview of your email style",
    styleOverride: previewStyle,
  });

  const buttonContrast = contrastRatio(resolved.accent, resolved.buttonText);
  const linkFellBack = resolved.linkColor.toLowerCase() !== resolved.accent;
  const isDirty = form.formState.isDirty;
  const isSubmitting = save.isPending;
  const logoDisabled = values.header === "name" || !initial.hasLogo;

  useDirtyForm(isDirty);

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        className="bg-muted min-h-screen"
      >
        <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
          <div className="toolbar-info">
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href="/admin/marketing">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
            <div className="hidden min-w-0 items-center gap-2 sm:flex">
              <h1 className="text-base font-medium">Email style</h1>
              <span
                className={`admin-status-badge ${isDirty ? "isDirty" : "isPublished"}`}
              >
                {isDirty ? "Unsaved Changes" : "Saved"}
              </span>
            </div>
          </div>
          <div className="toolbar-actions items-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting || !isDirty}
              onClick={() => form.reset(initialValues(initial))}
              className="hidden md:inline-flex"
            >
              Discard
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting || !isDirty}>
              {isSubmitting ? (
                <>
                  <span className="saving-indicator" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="admin-container">
          <p className="text-muted-foreground mb-6 max-w-2xl text-sm">
            How your marketing emails look. Until you change something, your
            emails use the {initial.templateName} template&apos;s colors and
            font. Receipts and other order emails aren&apos;t affected.
          </p>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Colors and font</CardTitle>
                  <CardDescription>
                    The accent colors buttons and links; the page background
                    sits around the email.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ColorField form={form} name="accent" label="Accent color" />
                  {buttonContrast < 4.5 && (
                    <Alert variant="warning">
                      <TriangleAlert className="h-4 w-4" />
                      <AlertTitle>Button text is hard to read</AlertTitle>
                      <AlertDescription>
                        Button labels on this color have a contrast of{" "}
                        {buttonContrast.toFixed(1)}:1; aim for at least 4.5:1.
                        Try a darker or lighter accent.
                      </AlertDescription>
                    </Alert>
                  )}
                  {linkFellBack && (
                    <p className="text-muted-foreground flex items-start gap-2 text-sm">
                      <Info
                        className="mt-0.5 h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      Links will use dark gray so they stay readable.
                    </p>
                  )}
                  <ColorField
                    form={form}
                    name="pageBackground"
                    label="Page background"
                  />
                  <ChoiceGroup
                    form={form}
                    name="font"
                    label="Font"
                    options={FONT_OPTIONS}
                    renderLabel={(option) => (
                      <span
                        style={{ fontFamily: EMAIL_FONT_STACKS[option.value] }}
                      >
                        <span className="block font-medium">
                          {option.label}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          The quick brown fox
                        </span>
                      </span>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Header and footer</CardTitle>
                  <CardDescription>
                    What appears at the top and bottom of every email.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <ChoiceGroup
                    form={form}
                    name="header"
                    label="Header"
                    options={HEADER_OPTIONS}
                    description={
                      initial.hasLogo
                        ? undefined
                        : "Add a logo in Brand & Appearance to use a logo header; until then your store name is shown."
                    }
                  />
                  <ChoiceGroup
                    form={form}
                    name="logoSize"
                    label="Logo size"
                    options={LOGO_SIZE_OPTIONS}
                    disabled={logoDisabled}
                  />

                  <FormField
                    control={form.control}
                    name="showSocial"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between gap-4 rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel>Show social links</FormLabel>
                          <FormDescription>
                            {initial.socialLinks.length > 0 ? (
                              <>
                                Links to{" "}
                                {initial.socialLinks
                                  .map((l) => l.label)
                                  .join(", ")}{" "}
                                in the footer. Change them in{" "}
                                <Link
                                  href="/admin/content/branding"
                                  className="underline underline-offset-2"
                                >
                                  Brand &amp; Appearance
                                </Link>
                                .
                              </>
                            ) : (
                              <>
                                You haven&apos;t added any social links yet. Add
                                them in{" "}
                                <Link
                                  href="/admin/content/branding"
                                  className="underline underline-offset-2"
                                >
                                  Brand &amp; Appearance
                                </Link>
                                .
                              </>
                            )}
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="footerNote"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Footer note</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={3}
                            placeholder="Optional: a line like “Handmade in Ann Arbor, Michigan.”"
                          />
                        </FormControl>
                        <div className="flex items-start justify-between gap-3">
                          <FormDescription>
                            Shown above the unsubscribe link.
                          </FormDescription>
                          <span
                            className={cn(
                              "text-muted-foreground shrink-0 text-xs tabular-nums",
                              field.value.length > FOOTER_NOTE_MAX &&
                                "text-destructive",
                            )}
                          >
                            {field.value.length}/{FOOTER_NOTE_MAX}
                          </span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSubmitting}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                      Reset to template default ({initial.templateName})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Reset to the {initial.templateName} default?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Your saved colors, font, header and footer settings are
                        removed, and emails use your template&apos;s look again.
                        Campaigns already sent aren&apos;t changed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep my settings</AlertDialogCancel>
                      <AlertDialogAction onClick={onReset}>
                        Reset
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="space-y-3 lg:sticky lg:top-20">
              <h2 className="text-sm font-medium">Preview</h2>
              <EmailPreviewFrame
                html={preview.html}
                loading={preview.loading}
              />
              <p className="text-muted-foreground text-xs">
                A sample message. Your campaigns use the same style.
                {preview.error ? ` ${preview.error}` : ""}
              </p>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
