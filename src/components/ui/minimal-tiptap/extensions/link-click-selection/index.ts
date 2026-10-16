import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorView } from "@tiptap/pm/view";
import { Extension, getMarkRange } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";

/**
 * The whole link (`{ from, to }`) whose text starts at `pos`, or one the
 * position sits inside / at the end of; `null` when there's no link there.
 *
 * Matches on the link mark's own attrs: TipTap's `getMarkRange` otherwise
 * matches the FIRST mark on the text node, which misses a link that's also
 * coloured (textStyle) and splits two adjacent links with different hrefs.
 */
export function linkRangeAt(
  doc: ProseMirrorNode,
  pos: number,
): { from: number; to: number } | null {
  const linkType = doc.type.schema.marks.link;
  if (!linkType) return null;
  const $pos = doc.resolve(Math.max(0, Math.min(pos, doc.content.size)));
  const after = $pos.parent.childAfter($pos.parentOffset).node;
  const before = $pos.parent.childBefore($pos.parentOffset).node;
  const mark =
    linkType.isInSet(after?.marks ?? []) ??
    linkType.isInSet(before?.marks ?? []);
  if (!mark) return null;
  const range = getMarkRange($pos, linkType, mark.attrs);
  return range ? { from: range.from, to: range.to } : null;
}

/** The `<a>` a click landed on (or inside), if it belongs to this editor. */
function clickedAnchor(view: EditorView, event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) return null;
  const anchor = target.closest("a");
  return anchor && view.dom.contains(anchor) ? anchor : null;
}

export const linkClickSelectionKey = new PluginKey("linkClickSelection");

/**
 * Clicking any link in the editor — plain or button (`variant`) — selects
 * the whole link, so its bubble menu opens (and owns the selection over a
 * row's / table's menu).
 *
 * The stock Link `enableClickSelection` does this from the editor's CURRENT
 * selection, which only works when the browser already put the caret inside
 * the link. A button link is `display: inline-flex` with padding, and a
 * click on its padding / flex box leaves the caret outside the link (or
 * where it was), so the stock handler extended nothing and the row menu
 * showed instead. This resolves the range from the clicked `<a>` element
 * itself. Priority above Link's (1000) so it runs first; it returns `false`
 * (deferring to the stock handlers) for modified clicks and non-links.
 */
export const LinkClickSelection = Extension.create({
  name: "linkClickSelection",

  priority: 1001,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: linkClickSelectionKey,
        props: {
          handleClick: (view, _pos, event) => {
            if (event.button !== 0) return false;
            if (
              event.shiftKey ||
              event.metaKey ||
              event.ctrlKey ||
              event.altKey
            ) {
              return false;
            }
            if (!view.editable) return false;
            const anchor = clickedAnchor(view, event);
            if (!anchor) return false;

            let start: number;
            try {
              start = view.posAtDOM(anchor, 0);
            } catch {
              return false;
            }
            const range = linkRangeAt(view.state.doc, start);
            if (!range) return false;

            const { selection } = view.state;
            if (selection.from !== range.from || selection.to !== range.to) {
              view.dispatch(
                view.state.tr.setSelection(
                  TextSelection.create(view.state.doc, range.from, range.to),
                ),
              );
            }
            return true;
          },
        },
      }),
    ];
  },
});
