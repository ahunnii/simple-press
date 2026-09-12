"use client";

import { useState } from "react";
import { Check, Link as LinkIcon } from "lucide-react";

import { EmailIcon } from "~/components/icons/email-icon";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { PinterestIcon } from "~/components/icons/pinterest-icon";
import { TwitterIcon } from "~/components/icons/twitter-icon";

import { OliveButton } from "../shared";

type Props = {
  title: string;
  /** Post path, e.g. "/blog/spring-wedding-guest-outfits". */
  path: string;
};

/**
 * OliveBlogShareRow — copy link, X, Facebook, Pinterest, email.
 *
 * Plain buttons rather than real `<a href>` share links: the absolute URL
 * only exists in the browser (custom domains and subdomains both resolve to
 * different origins), so it's read from `window.location.origin` at click
 * time rather than baked into an `href` at render time — an `href` computed
 * from `window` would mismatch between the server-rendered "" and the
 * client's real origin and trip a hydration warning.
 */
export function OliveBlogShareRow({ title, path }: Props) {
  const [copied, setCopied] = useState(false);

  const absoluteUrl = () =>
    typeof window !== "undefined" ? `${window.location.origin}${path}` : path;

  const handleCopy = () => {
    void navigator.clipboard
      .writeText(absoluteUrl())
      .then(() => {
        setCopied(true);
        window.setTimeout(() => {
          setCopied(false);
        }, 2000);
      })
      .catch(() => {
        // Clipboard API unavailable (older browser, insecure context) —
        // silently no-op; the address bar still has the real link.
      });
  };

  const openIntent = (build: (url: string, title: string) => string) => {
    window.open(
      build(absoluteUrl(), title),
      "_blank",
      "noopener,noreferrer,width=600,height=500",
    );
  };

  const handleEmail = () => {
    const url = absoluteUrl();
    window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
  };

  return (
    <div
      role="group"
      aria-label="Share this post"
      className="flex flex-wrap gap-2"
    >
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {copied ? "Link copied to clipboard" : ""}
      </span>

      <OliveButton variant="secondary" size="sm" onClick={handleCopy}>
        {copied ? (
          <Check aria-hidden="true" className="h-4 w-4" />
        ) : (
          <LinkIcon aria-hidden="true" className="h-4 w-4" />
        )}
        {copied ? "Copied" : "Copy link"}
      </OliveButton>

      <OliveButton
        variant="secondary"
        size="sm"
        onClick={() => {
          openIntent(
            (url, t) =>
              `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(t)}`,
          );
        }}
      >
        <TwitterIcon className="h-4 w-4" />
        Share on X
      </OliveButton>

      <OliveButton
        variant="secondary"
        size="sm"
        onClick={() => {
          openIntent(
            (url) =>
              `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          );
        }}
      >
        <FacebookIcon className="h-4 w-4" />
        Share on Facebook
      </OliveButton>

      <OliveButton
        variant="secondary"
        size="sm"
        onClick={() => {
          openIntent(
            (url, t) =>
              `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(t)}`,
          );
        }}
      >
        <PinterestIcon className="h-4 w-4" />
        Share on Pinterest
      </OliveButton>

      <OliveButton variant="secondary" size="sm" onClick={handleEmail}>
        <EmailIcon className="h-4 w-4" />
        Email
      </OliveButton>
    </div>
  );
}
