import * as React from "react";
import { ChevronDown, FileText, Globe, Newspaper } from "lucide-react";

import { enabledSiteLinks } from "~/lib/site-links";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useFeatureFlags } from "~/hooks/use-feature-flags";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";

export interface SiteLinkPickerProps {
  /** Called with a same-site path such as `/contact` or `/blog/my-post`. */
  onPick: (path: string) => void;
}

/**
 * "Link to a page on your site" — an inline combobox (not a portaled
 * Popover: inside the link bubble menu, focus moving into a portal would blur
 * the editor and dismiss the menu) listing the store's built-in routes, the
 * owner's pages and blog posts.
 *
 * Data is fetched only once the list is opened. Feature flags come from the
 * same `features.getFlags` query the media-library hook uses; if flags or
 * pages can't be loaded (e.g. a non-owner session) the picker degrades to the
 * always-on routes rather than erroring.
 */
export function SiteLinkPicker({ onPick }: SiteLinkPickerProps) {
  const [open, setOpen] = React.useState(false);

  const flagsQuery = api.features.getFlags.useQuery(undefined, {
    enabled: open,
    retry: false,
  });
  const pagesQuery = api.content.getEditorPages.useQuery(undefined, {
    enabled: open,
    retry: false,
  });
  const { isEnabled } = useFeatureFlags({
    flags: flagsQuery.data?.flags ?? {},
  });

  const builtIns = React.useMemo(
    // Without flag data, treat every flag as off: only ungated routes show.
    () => enabledSiteLinks(flagsQuery.data ? isEnabled : () => false),
    [flagsQuery.data, isEnabled],
  );

  const { pages, posts } = React.useMemo(() => {
    const taken = new Set(builtIns.map((l) => l.path));
    const pages: { path: string; title: string; draft: boolean }[] = [];
    const posts: { path: string; title: string; draft: boolean }[] = [];
    for (const p of pagesQuery.data ?? []) {
      const isPost = p.type === "blog";
      const path = isPost ? `/blog/${p.slug}` : `/${p.slug}`;
      if (taken.has(path)) continue;
      (isPost ? posts : pages).push({
        path,
        title: p.live.title || p.slug,
        draft: !p.published,
      });
    }
    return { pages, posts };
  }, [builtIns, pagesQuery.data]);

  const pick = (path: string) => {
    onPick(path);
    setOpen(false);
  };

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground -ml-2 h-7 px-2 text-xs"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Globe className="size-3.5" />
        Link to a page on your site
        <ChevronDown
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
        />
      </Button>
      {open && (
        <Command className="h-auto rounded-md border">
          <CommandInput placeholder="Search pages…" />
          <CommandList className="max-h-48">
            <CommandEmpty>
              {pagesQuery.isLoading ? "Loading…" : "No matching pages."}
            </CommandEmpty>
            <CommandGroup heading="Site pages">
              {builtIns.map((link) => (
                <CommandItem
                  key={link.id}
                  value={`${link.label} ${link.path}`}
                  onSelect={() => pick(link.path)}
                >
                  <Globe />
                  <span className="truncate">{link.label}</span>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {link.path}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
            {pages.length > 0 && (
              <CommandGroup heading="Your pages">
                {pages.map((page) => (
                  <CommandItem
                    key={page.path}
                    value={`${page.title} ${page.path}`}
                    onSelect={() => pick(page.path)}
                  >
                    <FileText />
                    <span className="truncate">{page.title}</span>
                    <span className="text-muted-foreground ml-auto text-xs">
                      {page.draft ? "Draft" : page.path}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {posts.length > 0 && (
              <CommandGroup heading="Blog posts">
                {posts.map((post) => (
                  <CommandItem
                    key={post.path}
                    value={`${post.title} ${post.path}`}
                    onSelect={() => pick(post.path)}
                  >
                    <Newspaper />
                    <span className="truncate">{post.title}</span>
                    {post.draft && (
                      <span className="text-muted-foreground ml-auto text-xs">
                        Draft
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      )}
    </div>
  );
}
