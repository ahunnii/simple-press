import type { EditorView } from "@tiptap/pm/view";
import { dropPoint } from "@tiptap/pm/transform";

import { dropWouldNestRow } from "./helpers";

/** Class on the drop cursor's host while a drop there would be refused. */
export const DROP_REFUSED_CLASS = "mt-drop-refused";
/** Class on the host while our own indicator stands in for the drop cursor. */
const OWN_INDICATOR_CLASS = "mt-drop-own-indicator";
const INDICATOR_CLASS = "mt-drop-indicator";
const INDICATOR_WIDTH = 2;

/** The element prosemirror-dropcursor draws in: the editor's offsetParent. */
export function dropHost(view: EditorView): HTMLElement | null {
  const host = view.dom.offsetParent;
  return host instanceof HTMLElement ? host : null;
}

/**
 * Let internal drags (the side-menu grip, ProseMirror's own node/text drags)
 * drop onto atom node views — images, videos, galleries, embeds, forms,
 * quote calculators.
 *
 * Why this is needed: Tiptap's `NodeView.stopEvent` returns true for every
 * `drag*` event whose target is inside a node view's own (non-content) DOM,
 * unless that node is the one being dragged. ProseMirror then skips its
 * dragover handler — whose `preventDefault()` is what tells the browser
 * "droppable here" — so the browser never fires `drop`, and nothing shows
 * where the block would land. `drop` itself is not stopped, so ProseMirror's
 * drop handler (with `dropPoint`, which puts the block before/after the
 * atom) works once the drop is allowed.
 *
 * How: a bubble-phase `dragover`/`dragenter` listener on the editor,
 * registered after ProseMirror's own (plugin views are created after the
 * view's input handlers). If nobody accepted the spot (`defaultPrevented`
 * is false) while `view.dragging` is set, this accepts it — unless the
 * rows-never-nest guard refuses — and draws its own drop indicator at the
 * same `dropPoint` ProseMirror will use (prosemirror-dropcursor's view isn't
 * reachable, and its listener may be stopped by the same node views), hiding
 * the stock drop cursor meanwhile. Spots ProseMirror accepted itself are left
 * to it and the stock cursor. File drags from the desktop (`view.dragging`
 * is null) are untouched, so FileHandler behaves as before; image resizing
 * uses pointer events, not drag events, so it is unaffected.
 */
export function attachNodeViewDrop(view: EditorView): () => void {
  let indicator: HTMLElement | null = null;
  let host: HTMLElement | null = null;

  const hide = () => {
    indicator?.remove();
    indicator = null;
    host?.classList.remove(OWN_INDICATOR_CLASS);
    host = null;
  };

  const show = (pos: number) => {
    const parent = dropHost(view);
    if (!parent) {
      hide();
      return;
    }
    const $pos = view.state.doc.resolve(pos);
    let rect: { left: number; right: number; top: number; bottom: number } = {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    };
    let found = false;
    if (!$pos.parent.inlineContent) {
      const before = $pos.nodeBefore;
      const after = $pos.nodeAfter;
      if (before || after) {
        const node = view.nodeDOM(pos - (before ? before.nodeSize : 0));
        if (node instanceof HTMLElement) {
          const box = node.getBoundingClientRect();
          let top = before ? box.bottom : box.top;
          if (before && after) {
            const next = view.nodeDOM(pos);
            if (next instanceof HTMLElement) {
              top = (top + next.getBoundingClientRect().top) / 2;
            }
          }
          rect = {
            left: box.left,
            right: box.right,
            top: top - INDICATOR_WIDTH / 2,
            bottom: top + INDICATOR_WIDTH / 2,
          };
          found = true;
        }
      }
    }
    if (!found) {
      const coords = view.coordsAtPos(pos);
      rect = {
        left: coords.left - INDICATOR_WIDTH / 2,
        right: coords.left + INDICATOR_WIDTH / 2,
        top: coords.top,
        bottom: coords.bottom,
      };
    }

    if (host !== parent) {
      hide();
      host = parent;
    }
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.className = INDICATOR_CLASS;
      indicator.setAttribute("aria-hidden", "true");
      parent.appendChild(indicator);
    }
    parent.classList.add(OWN_INDICATOR_CLASS);
    const parentBox = parent.getBoundingClientRect();
    Object.assign(indicator.style, {
      left: `${rect.left - parentBox.left - parent.clientLeft + parent.scrollLeft}px`,
      top: `${rect.top - parentBox.top - parent.clientTop + parent.scrollTop}px`,
      width: `${rect.right - rect.left}px`,
      height: `${rect.bottom - rect.top}px`,
    });
  };

  const onDragOver = (event: DragEvent) => {
    // ProseMirror (or a guard) already handled this spot: not over a node
    // view, so the stock drop cursor is in charge.
    if (event.defaultPrevented) {
      hide();
      return;
    }
    const slice = view.dragging?.slice;
    if (!slice || !view.editable) {
      hide();
      return;
    }
    const hit = view.posAtCoords({ left: event.clientX, top: event.clientY });
    if (!hit) {
      hide();
      return;
    }
    const { doc } = view.state;
    const refused = dropWouldNestRow(doc, hit.pos, slice);
    dropHost(view)?.classList.toggle(DROP_REFUSED_CLASS, refused);
    if (refused) {
      hide();
      return;
    }
    event.preventDefault();
    show(dropPoint(doc, hit.pos, slice) ?? hit.pos);
  };

  const onDragLeave = (event: DragEvent) => {
    const to = event.relatedTarget;
    if (!(to instanceof Node) || !view.dom.contains(to)) hide();
  };

  const dom = view.dom;
  dom.addEventListener("dragenter", onDragOver);
  dom.addEventListener("dragover", onDragOver);
  dom.addEventListener("dragleave", onDragLeave);
  dom.addEventListener("drop", hide);
  document.addEventListener("dragend", hide);

  return () => {
    dom.removeEventListener("dragenter", onDragOver);
    dom.removeEventListener("dragover", onDragOver);
    dom.removeEventListener("dragleave", onDragLeave);
    dom.removeEventListener("drop", hide);
    document.removeEventListener("dragend", hide);
    hide();
  };
}
