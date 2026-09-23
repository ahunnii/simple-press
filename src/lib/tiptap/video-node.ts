import { mergeAttributes, Node } from "@tiptap/core";

/**
 * Shared `video` node definition: uploaded (not embedded) video clips in
 * custom pages and blog posts.
 *
 * This module must stay free of React, tRPC and `server-only` — it is
 * imported by both halves of the render pipeline:
 *  - `RENDERER_BASE_EXTENSIONS` (`~/lib/tiptap/renderer-extensions`), the
 *    storefront's client/server-shared schema source;
 *  - `SERVER_EXTENSIONS` (`~/lib/wordpress/tiptap-to-html`), the WordPress
 *    export's server-only serializer.
 *
 * The editor-side extension (`VideoNode.extend(...)` under
 * `~/components/ui/minimal-tiptap/extensions/video`) adds the upload
 * commands and the React node view on top of this.
 */

export interface VideoNodeAttrs {
  /** S3/storage URL (or relative path) of the uploaded clip. Never a raw URL field in the editor. */
  src: string | null;
  /** Accessible label. Rendered as both the `title` and `aria-label` attrs. */
  title: string | null;
  /**
   * Ambient playback: muted, autoplay, loop, no controls. Off (`false`) is
   * the default — a clip with visible controls and sound.
   */
  ambient: boolean;
}

export interface VideoOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    video: {
      /**
       * Insert a video node. Defined here so the base node is a valid,
       * self-contained schema citizen; the editor extension adds the
       * upload-aware `setVideo` / `toggleVideoAmbient` commands on top.
       */
      insertVideo: (attrs?: Partial<VideoNodeAttrs>) => ReturnType;
    };
  }
}

/** True when `node` is a `video` node — mirrors `isEmbedNode` in the renderer/exporter. */
export function isVideoNode(
  node: unknown,
): node is { type: "video"; attrs: VideoNodeAttrs } {
  if (node == null || typeof node !== "object") return false;
  const n = node as { type?: unknown };
  return n.type === "video";
}

export const VideoNode = Node.create<VideoOptions>({
  name: "video",

  group: "block",

  atom: true,

  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => element.getAttribute("src"),
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute("title"),
      },
      ambient: {
        default: false,
        parseHTML: (element) =>
          element.hasAttribute("autoplay") || element.hasAttribute("loop"),
        // The node-level `renderHTML` below builds the tag's attributes by
        // hand from `node.attrs`, so `ambient` itself must never surface as
        // a literal `ambient="..."` HTML attribute.
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "video[src]" }];
  },

  renderHTML({ node }) {
    const attrs = node.attrs as VideoNodeAttrs;

    // Built by hand rather than left to `mergeAttributes` filtering: it
    // merges keys as-is, so a `src`/`title` of `undefined` would otherwise
    // reach `setAttribute` and render as the literal string "undefined".
    const shared: Record<string, string> = {
      playsinline: "",
      preload: "metadata",
    };
    if (attrs.src) shared.src = attrs.src;
    if (attrs.title) {
      shared.title = attrs.title;
      shared["aria-label"] = attrs.title;
    }

    if (attrs.ambient) {
      return [
        "video",
        mergeAttributes(this.options.HTMLAttributes, shared, {
          muted: "",
          autoplay: "",
          loop: "",
        }),
      ];
    }

    return [
      "video",
      mergeAttributes(this.options.HTMLAttributes, shared, {
        controls: "",
      }),
    ];
  },

  addCommands() {
    return {
      insertVideo:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attrs ?? {},
          });
        },
    };
  },
});
