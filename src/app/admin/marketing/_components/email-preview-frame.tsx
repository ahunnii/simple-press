"use client";

import type { JSONContent } from "@tiptap/core";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader2, Monitor, Smartphone } from "lucide-react";

import type { EmailStyle } from "~/lib/marketing/email-style";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

type Viewport = "desktop" | "mobile";

/**
 * Frame widths. Desktop is wider than the email's 600px column so the page
 * background shows around the card, as it does in a real inbox.
 */
const VIEWPORT_WIDTH: Record<Viewport, number> = { desktop: 720, mobile: 375 };
const FRAME_HEIGHT = 720;

/**
 * A rendered campaign email inside a fully sandboxed iframe (no scripts, no
 * same-origin access, links inert) with a Desktop / Mobile switch. The frame
 * keeps a fixed height and scrolls internally; when the container is narrower
 * than the chosen width the whole frame is scaled down to fit.
 */
export function EmailPreviewFrame({
  html,
  loading = false,
  className,
}: {
  html: string | null;
  loading?: boolean;
  className?: string;
}) {
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerWidth(el.clientWidth);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const width = VIEWPORT_WIDTH[viewport];
  const scale = containerWidth > 0 ? Math.min(1, containerWidth / width) : 1;
  const scaledWidth = width * scale;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={viewport}
          onValueChange={(v) => {
            if (v === "desktop" || v === "mobile") setViewport(v);
          }}
          aria-label="Preview width"
        >
          <ToggleGroupItem value="desktop" aria-label="Desktop width">
            <Monitor className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Desktop
          </ToggleGroupItem>
          <ToggleGroupItem value="mobile" aria-label="Mobile width">
            <Smartphone className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Mobile
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div
        ref={containerRef}
        className="bg-muted/40 relative w-full overflow-hidden rounded-md border"
        style={{ height: FRAME_HEIGHT * scale }}
      >
        {html === null ? (
          <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm">
            {loading ? "Rendering preview…" : "Nothing to preview yet."}
          </div>
        ) : (
          <iframe
            title="Email preview"
            // Empty sandbox: no scripts, no same-origin access, no navigation.
            sandbox=""
            srcDoc={html}
            style={{
              width,
              height: FRAME_HEIGHT,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              // Centers the frame when it is narrower than the container.
              marginLeft: Math.max(0, (containerWidth - scaledWidth) / 2),
            }}
            className="block border-0 bg-white"
          />
        )}
        {loading && html !== null && (
          <div
            className="bg-background/40 pointer-events-none absolute inset-0 flex items-start justify-end p-2"
            aria-hidden="true"
          >
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}

const EMPTY_DOC: JSONContent = { type: "doc", content: [] };
const DEBOUNCE_MS = 500;

/**
 * Debounced live preview of a campaign (`marketing.previewCampaign`).
 *
 * - `styleOverride`: undefined = the saved style, null = template defaults,
 *   an object = unsaved settings (the style page).
 * - Out-of-order responses are dropped; the previous `html` stays visible
 *   while the next render is in flight (`loading` is true meanwhile).
 */
export function useCampaignPreview({
  bodyJson,
  previewText,
  styleOverride,
  enabled = true,
}: {
  bodyJson: JSONContent | null | undefined;
  previewText?: string;
  styleOverride?: EmailStyle | null;
  enabled?: boolean;
}): {
  html: string | null;
  warnings: string[];
  loading: boolean;
  error: string | null;
} {
  const { mutateAsync } = api.marketing.previewCampaign.useMutation();
  const [state, setState] = useState<{
    html: string | null;
    warnings: string[];
    loading: boolean;
    error: string | null;
  }>({ html: null, warnings: [], loading: false, error: null });
  const seq = useRef(0);
  const first = useRef(true);

  const input = JSON.stringify({
    bodyJson: bodyJson ?? EMPTY_DOC,
    previewText: previewText?.trim()
      ? previewText.trim().slice(0, 200)
      : undefined,
    styleOverride,
  });

  useEffect(() => {
    if (!enabled) return;
    const id = ++seq.current;
    const delay = first.current ? 0 : DEBOUNCE_MS;
    first.current = false;
    setState((s) => ({ ...s, loading: true }));
    const timer = setTimeout(() => {
      const payload = JSON.parse(input) as {
        bodyJson: JSONContent;
        previewText?: string;
        styleOverride?: EmailStyle | null;
      };
      mutateAsync({
        bodyJson: payload.bodyJson as Record<string, unknown>,
        previewText: payload.previewText,
        styleOverride: payload.styleOverride,
      }).then(
        (result) => {
          if (seq.current !== id) return;
          setState({
            html: result.html,
            warnings: result.warnings,
            loading: false,
            error: null,
          });
        },
        (err: unknown) => {
          if (seq.current !== id) return;
          setState((s) => ({
            ...s,
            loading: false,
            error:
              err instanceof Error
                ? err.message
                : "Couldn't render the preview.",
          }));
        },
      );
    }, delay);
    return () => clearTimeout(timer);
  }, [input, enabled, mutateAsync]);

  return state;
}
