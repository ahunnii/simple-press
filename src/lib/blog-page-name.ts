import { resolveTemplateFields } from "~/lib/resolve-template-fields";
import { TEMPLATE_FIELDS } from "~/lib/template-fields";

export const DEFAULT_BLOG_PAGE_NAME = "Blog";

/**
 * What the store calls its `/blog` page — the post breadcrumb trail and the
 * listing's fallback `<title>` (an owner's Admin → SEO title still wins).
 *
 * Opt-in per template: a template that declares `<templateId>.blog.page-name`
 * (umsc, whose `/blog` is the owner's "Community" page) gets its saved value
 * or field default; every other template, and a blank value, stays "Blog".
 */
export function resolveBlogPageName(
  templateId: string | null | undefined,
  customFields: unknown,
): string {
  if (!templateId) return DEFAULT_BLOG_PAGE_NAME;
  const key = `${templateId}.blog.page-name`;
  const field = TEMPLATE_FIELDS[templateId]?.find((f) => f.key === key);
  if (!field) return DEFAULT_BLOG_PAGE_NAME;

  const value = resolveTemplateFields(
    customFields,
    [key],
    new Map([[key, field]]),
  )[key];
  return value?.trim() ?? DEFAULT_BLOG_PAGE_NAME;
}
