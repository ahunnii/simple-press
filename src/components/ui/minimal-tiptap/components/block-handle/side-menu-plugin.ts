import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { Plugin, PluginKey } from "@tiptap/pm/state";

import type { FoundBlock } from "../../extensions/block-move/helpers";

import {
  blockAroundResolved,
  blockAt,
  isBlockContainer,
} from "../../extensions/block-move/helpers";

/**
 * Hover tracking for the block side menu (⋮⋮ grip + "+").
 *
 * Why not `@tiptap/extension-drag-handle`'s nested mode: it resolves the
 * hovered node from `posAtCoords().pos`, which for an atom (image, video,
 * gallery, form, spacer…) is the position *beside* it, so photos — the main
 * thing owners want to move or add a line after — never get a handle (at the
 * top level nothing is found; in a column the whole row is). Its
 * `allowedContainers` is also an "any ancestor" test that includes the doc
 * (so it can't express "direct child of doc / column / collapsible"), and
 * its edge detection hands the handle to the row whenever the pointer nears
 * a block's left or top edge — i.e. on the way to the handle. This plugin
 * keeps the same model (a positioned handle outside the content, a
 * NodeSelection drag) with targeting that fits our containers:
 *
 *  - The target is the innermost block that is a direct child of the doc, a
 *    `column` or a `detailsContent` (see BLOCK_CONTAINERS). Inside lists,
 *    quotes and tables that is the whole list / quote / table.
 *  - Atoms are found through `posAtCoords().inside`.
 *  - A column's (or collapsible content's) frame — the EDGE px along its
 *    border, plus the gap between columns — targets the whole row /
 *    collapsible; its interior between two blocks targets the nearest one.
 *  - The left gutter is clamped into the content, so it lands on that frame:
 *    hover left of a row to grab the row.
 *  - While the pointer travels left from a block toward its handle (same
 *    rows, up to HANDLE_REACH px), the target sticks.
 */

export interface HoveredBlock extends FoundBlock {
  /** The block's DOM node (what the handle lines up with). */
  dom: HTMLElement;
}

export const blockSideMenuPluginKey = new PluginKey("blockSideMenu");

/** Px band along a column / collapsible frame that targets the outer block. */
const EDGE = 8;
/** Px left of a block the pointer may travel toward its handle and keep it. */
const HANDLE_REACH = 52;

interface Point {
  x: number;
  y: number;
}

function blockDom(view: EditorView, pos: number): HTMLElement | null {
  const dom = view.nodeDOM(pos);
  return dom instanceof HTMLElement ? dom : null;
}

/** The child of `container` (content starting at `start`) nearest to `y`. */
function nearestChild(
  view: EditorView,
  container: ProseMirrorNode,
  start: number,
  y: number,
): FoundBlock | null {
  let best: FoundBlock | null = null;
  let bestDistance = Infinity;
  container.forEach((node, offset) => {
    const pos = start + offset;
    const dom = blockDom(view, pos);
    if (!dom) return;
    const rect = dom.getBoundingClientRect();
    const distance =
      y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { node, pos };
    }
  });
  return best;
}

function nearFrame(rect: DOMRect, point: Point) {
  return (
    point.x - rect.left < EDGE ||
    rect.right - point.x < EDGE ||
    point.y - rect.top < EDGE ||
    rect.bottom - point.y < EDGE
  );
}

/** The block under a point already clamped into the content box. */
function blockAtPoint(view: EditorView, point: Point): FoundBlock | null {
  const hit = view.posAtCoords({ left: point.x, top: point.y });
  if (!hit) return null;
  const { doc } = view.state;

  // Not inside any node: between two top-level blocks.
  if (hit.inside < 0) return nearestChild(view, doc, 0, point.y);

  const inner = doc.nodeAt(hit.inside);
  if (!inner) return null;
  const $inside = doc.resolve(hit.inside);

  if (isBlockContainer(inner)) {
    // On a column / collapsible content itself, not on one of its blocks.
    const dom = blockDom(view, hit.inside);
    if (dom && !nearFrame(dom.getBoundingClientRect(), point)) {
      const child = nearestChild(view, inner, hit.inside + 1, point.y);
      if (child) return child;
    }
    return blockAroundResolved($inside);
  }

  if (inner.isBlock && isBlockContainer($inside.parent)) {
    return { node: inner, pos: hit.inside };
  }
  return blockAroundResolved($inside);
}

/**
 * The block to show the handle for, `null` for none, or `undefined` to keep
 * the current one.
 */
export function findHoveredBlock(
  view: EditorView,
  pointer: Point,
  current: HoveredBlock | null,
): HoveredBlock | null | undefined {
  if (current?.dom.isConnected) {
    const rect = current.dom.getBoundingClientRect();
    if (
      pointer.y >= rect.top &&
      pointer.y <= rect.bottom &&
      pointer.x < rect.left &&
      pointer.x >= rect.left - HANDLE_REACH
    ) {
      return undefined;
    }
  }

  const { doc } = view.state;
  const first = doc.firstChild;
  const last = doc.lastChild;
  if (!first || !last) return null;
  const firstDom = blockDom(view, 0);
  const lastDom = blockDom(view, doc.content.size - last.nodeSize);
  if (!firstDom || !lastDom) return undefined;

  const box = view.dom.getBoundingClientRect();
  const style = getComputedStyle(view.dom);
  const left =
    box.left +
    (parseFloat(style.borderLeftWidth) || 0) +
    (parseFloat(style.paddingLeft) || 0);
  const right =
    box.right -
    (parseFloat(style.borderRightWidth) || 0) -
    (parseFloat(style.paddingRight) || 0);
  const top = firstDom.getBoundingClientRect().top;
  const bottom = lastDom.getBoundingClientRect().bottom;
  if (right - left < 4 || bottom - top < 2) return undefined;

  const point = {
    x: Math.min(Math.max(pointer.x, left + 2), right - 2),
    y: Math.min(Math.max(pointer.y, top + 1), bottom - 1),
  };
  const block = blockAtPoint(view, point);
  if (!block) return undefined;
  const dom = blockDom(view, block.pos);
  return dom ? { ...block, dom } : undefined;
}

export interface BlockSideMenuPluginOptions {
  onChange: (block: HoveredBlock | null) => void;
  /** True while the grip's menu is open: the handle stays where it is. */
  isLocked: () => boolean;
  /** The side menu element: leaving the editor onto it keeps the handle. */
  getMenuElement: () => HTMLElement | null;
}

export interface BlockSideMenuController {
  plugin: Plugin;
  /** Hide the handle (e.g. the pointer left the side menu for elsewhere). */
  clear: () => void;
}

export function createBlockSideMenu({
  onChange,
  isLocked,
  getMenuElement,
}: BlockSideMenuPluginOptions): BlockSideMenuController {
  let current: HoveredBlock | null = null;
  /** `current.pos` mapped through doc changes (null once it's deleted). */
  let mappedPos: number | null = null;
  let docChanged = false;
  let frame = 0;
  let pending: Point | null = null;

  const set = (next: HoveredBlock | null) => {
    if (
      next?.pos === current?.pos &&
      next?.node === current?.node &&
      next?.dom === current?.dom
    ) {
      return;
    }
    current = next;
    mappedPos = next?.pos ?? null;
    onChange(next);
  };

  const plugin = new Plugin({
    key: blockSideMenuPluginKey,
    state: {
      init: () => null,
      apply(tr, value) {
        // Follow the hovered block through edits (e.g. Move up from its own
        // menu); drop it once the block itself is deleted or replaced.
        if (tr.docChanged && mappedPos !== null) {
          const result = tr.mapping.mapResult(mappedPos, 1);
          mappedPos = result.deleted ? null : result.pos;
          docChanged = true;
        }
        return value;
      },
    },
    view: () => ({
      update(view) {
        if (!docChanged) return;
        docChanged = false;
        if (mappedPos === null) {
          set(null);
          return;
        }
        const block = blockAt(view.state.doc, mappedPos);
        const dom = block ? blockDom(view, block.pos) : null;
        set(block && dom ? { ...block, dom } : null);
      },
      destroy() {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        pending = null;
        current = null;
        mappedPos = null;
      },
    }),
    props: {
      handleDOMEvents: {
        mousemove(view, event) {
          if (isLocked()) return false;
          pending = { x: event.clientX, y: event.clientY };
          if (frame) return false;
          frame = requestAnimationFrame(() => {
            frame = 0;
            const point = pending;
            pending = null;
            if (!point || isLocked() || view.isDestroyed) return;
            if (!view.editable) {
              set(null);
              return;
            }
            const next = findHoveredBlock(view, point, current);
            if (next !== undefined) set(next);
          });
          return false;
        },
        mouseleave(_view, event) {
          if (isLocked()) return false;
          const to = event.relatedTarget;
          const menu = getMenuElement();
          if (menu && to instanceof Node && menu.contains(to)) return false;
          pending = null;
          set(null);
          return false;
        },
        // Typing hides the handle (it would sit over the text being edited).
        keydown() {
          if (!isLocked()) set(null);
          return false;
        },
      },
    },
  });

  return {
    plugin,
    clear: () => {
      pending = null;
      set(null);
    },
  };
}
