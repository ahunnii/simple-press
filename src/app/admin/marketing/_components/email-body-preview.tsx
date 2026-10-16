"use client";

import { useMemo, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/core";

import { tiptapToEmailHtml } from "~/lib/marketing/tiptap-to-email";

/**
 * Read-only preview of a campaign body exactly as the email renders it: the
 * same `tiptapToEmailHtml` output the send uses, inside a sandboxed iframe
 * (no scripts, own document) so admin styles can't leak in and the content
 * can't reach the page.
 */
export function EmailBodyPreview({
  doc,
  className,
}: {
  doc: JSONContent | null | undefined;
  className?: string;
}) {
  const html = useMemo(() => tiptapToEmailHtml(doc).html, [doc]);
  const srcDoc = useMemo(
    () =>
      `<!doctype html><html><head><meta charset="utf-8">` +
      `<meta name="color-scheme" content="light">` +
      `<base target="_blank">` +
      `<style>html,body{margin:0;background:#fff}` +
      `body{padding:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:26px;color:#333}` +
      `.wrap{max-width:600px;margin:0 auto}</style></head>` +
      `<body><div class="wrap">${html}</div></body></html>`,
    [html],
  );
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(160);

  const measure = () => {
    const body = frameRef.current?.contentDocument?.documentElement;
    if (body) setHeight(Math.max(120, body.scrollHeight));
  };

  if (html === "") {
    return (
      <p className="text-muted-foreground text-sm">Nothing to preview yet.</p>
    );
  }

  return (
    <iframe
      ref={frameRef}
      title="Email preview"
      // allow-same-origin only so the parent can measure the content; scripts
      // stay off, so nothing inside the frame can run.
      sandbox="allow-same-origin"
      srcDoc={srcDoc}
      onLoad={measure}
      style={{ height }}
      className={
        className ?? "bg-white w-full rounded-md border border-neutral-200"
      }
    />
  );
}
