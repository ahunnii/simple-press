import { NodeSelection } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";

import type { VideoNodeAttrs, VideoOptions } from "~/lib/tiptap/video-node";
import { VideoNode } from "~/lib/tiptap/video-node";

import { VideoViewBlock } from "./components/video-view-block";

/** Mirrors the `/api/upload` "video" route limit. */
export const VIDEO_MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Formats the editor accepts from the device picker and drag/drop/paste.
 * The upload route also takes AVI, but browsers can't play it inline, so it
 * is deliberately left out here.
 */
export const VIDEO_ACCEPTED_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

export interface VideoEditorOptions extends VideoOptions {
  /**
   * Uploads a clip and resolves to its stored URL. Videos are always
   * uploaded BEFORE the node is inserted — unlike images, a `blob:` src is
   * never written into the doc (a 50MB clip mid-upload could otherwise be
   * saved, and the storefront sanitizer drops `blob:` srcs anyway).
   */
  uploadFn?: (file: File) => Promise<string>;
  maxFileSize: number;
  /**
   * Shows "Choose from library" in the insert dialog. Only true when the
   * `media` feature flag is on — `media.list` throws FORBIDDEN otherwise.
   */
  mediaEnabled: boolean;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    videoEditor: {
      /** Insert an already-uploaded video clip at the current selection. */
      setVideo: (attrs: {
        src: string;
        title?: string | null;
        ambient?: boolean;
      }) => ReturnType;
      /** Flip ambient playback on the selected video node. */
      toggleVideoAmbient: () => ReturnType;
    };
  }
}

/**
 * Editor-side video node: the shared render-safe `VideoNode` plus upload
 * options, insert/toggle commands and the React node view. Only registered
 * when the editor is given a `videoUploader` (see `useMinimalTiptapEditor`).
 */
export const Video = VideoNode.extend<VideoEditorOptions>({
  addOptions() {
    return {
      ...(this.parent?.() ?? { HTMLAttributes: {} }),
      uploadFn: undefined,
      maxFileSize: VIDEO_MAX_FILE_SIZE,
      mediaEnabled: false,
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setVideo:
        ({ src, title, ambient }) =>
        ({ state, commands }) => {
          if (!src) return false;
          const attrs: VideoNodeAttrs = {
            src,
            title: title ?? null,
            ambient: ambient ?? false,
          };
          const content = { type: this.name, attrs };
          // A freshly inserted clip is left node-selected, and inserting over
          // a node selection replaces it — so a second insert would silently
          // swap out the first clip. Insert after a selected node instead.
          if (state.selection instanceof NodeSelection) {
            return commands.insertContentAt(state.selection.to, content);
          }
          return commands.insertContent(content);
        },
      toggleVideoAmbient:
        () =>
        ({ state, tr, dispatch }) => {
          const { selection } = state;
          if (
            !(selection instanceof NodeSelection) ||
            selection.node.type.name !== this.name
          ) {
            return false;
          }
          if (dispatch) {
            tr.setNodeMarkup(selection.from, undefined, {
              ...selection.node.attrs,
              ambient: !selection.node.attrs.ambient,
            });
          }
          return true;
        },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoViewBlock);
  },
});
