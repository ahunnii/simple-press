import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";

import { Column, Columns } from "./columns-node";
import { DETAILS_EXTENSIONS } from "./details-nodes";
import { createLinkExtension } from "./link-extension";
import { VideoNode } from "./video-node";

/**
 * The node/mark-defining half of `TiptapRenderer`'s extension list.
 *
 * Split out of `~/components/tiptap-renderer` so it can be imported from a
 * plain node context: the renderer also registers `Gallery`, `Embed` and
 * `QuoteCalculator`, whose React node views pull in `~/trpc/react` (and
 * through it the Prisma client), which makes the renderer module itself
 * unimportable from a unit test. Those three are appended back on in the
 * renderer, so the schema it derives is still the complete one.
 *
 * This module must stay free of React, tRPC and `server-only` — it is the
 * input to `getSchema()` on both the server and the client. `Form` (like
 * Gallery/Embed/QuoteCalculator) is also appended back on in the renderer
 * rather than declared here, for the same reason.
 *
 * The WordPress / site export (`~/lib/wordpress/tiptap-to-html`) renders with
 * this same list, so a node added here is exported too. `columns`/`column`
 * and the `details` trio are containers: both the renderer and the exporter
 * walk into them by hand so galleries/forms nested inside stay live.
 */
export const RENDERER_BASE_EXTENSIONS = [
  // StarterKit now bundles its own `link` and `underline`, so registering the
  // standalone extensions alongside it made TipTap log
  // `Duplicate extension names found: ['link', 'underline']` on every page that
  // renders rich text. Turning StarterKit's copies off keeps the configured
  // Link below (with the nofollow/protocol allowlist) authoritative instead of
  // leaving which one wins to registration order. The shared link adds the
  // button `variant` attr; `createLinkExtension` keeps the protocol allowlist.
  StarterKit.configure({ link: false, underline: false }),
  createLinkExtension({
    HTMLAttributes: {
      rel: "noopener noreferrer nofollow",
    },
  }),
  Image,
  VideoNode,
  Underline,
  TextStyle,
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  TableKit,
  Columns,
  Column,
  ...DETAILS_EXTENSIONS,
];
