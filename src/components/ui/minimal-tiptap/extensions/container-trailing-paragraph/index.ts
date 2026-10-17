import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/** Block containers whose content can end in an atom the caret can't leave. */
export const TRAILING_PARAGRAPH_CONTAINERS = ["column", "detailsContent"];

/**
 * StarterKit's TrailingNode only guarantees an empty paragraph at the end of
 * the DOCUMENT. A `column` or a collapsible's `detailsContent` that ends in an
 * image, gallery, table, spacer, ... leaves the owner nowhere to click to type
 * after it.
 *
 * This applies TrailingNode's own rule per container: when the last child is
 * not a paragraph (`notAfter` defaults to just `paragraph`), append an empty
 * one. Like TrailingNode it also runs on the first transaction, so old content
 * is padded when opened. The padding is invisible on the storefront
 * (`preserveBlankLines` drops trailing empties) and ignored by change
 * detection (`normalize-content`), and is kept out of undo history.
 */
export const ContainerTrailingParagraph = Extension.create({
  name: "containerTrailingParagraph",

  addProseMirrorPlugins() {
    const { schema } = this.editor;
    const paragraph = schema.nodes.paragraph;
    const containers = new Set(
      TRAILING_PARAGRAPH_CONTAINERS.map((name) => schema.nodes[name]).filter(
        (type): type is NonNullable<typeof type> => !!type,
      ),
    );
    // Email mode (or any schema without these nodes) has nothing to pad.
    if (!paragraph || containers.size === 0) return [];

    let initialPassDone = false;

    return [
      new Plugin({
        key: new PluginKey(this.name),
        // appendTransaction only runs when something dispatches, and a freshly
        // created editor may not dispatch before the owner clicks. Kick one
        // no-op transaction (after construction, when dispatch is safe) so
        // content opened with an unpadded container is padded right away.
        view: (view) => {
          queueMicrotask(() => {
            if (view.isDestroyed) return;
            view.dispatch(view.state.tr.setMeta("addToHistory", false));
          });
          return {};
        },
        appendTransaction: (transactions, _oldState, newState) => {
          const docChanged = transactions.some((tr) => tr.docChanged);
          if (initialPassDone && !docChanged) return null;
          initialPassDone = true;

          const insertAt: number[] = [];
          newState.doc.descendants((node, pos) => {
            if (!containers.has(node.type)) return true;
            const last = node.lastChild;
            if (last && last.type !== paragraph) {
              // End of the container's content (before its closing token).
              insertAt.push(pos + node.nodeSize - 1);
            }
            return true;
          });
          if (insertAt.length === 0) return null;

          const tr = newState.tr;
          // Back to front, so earlier positions are not shifted by inserts.
          insertAt.sort((a, b) => b - a);
          for (const pos of insertAt) tr.insert(pos, paragraph.create());
          return tr.setMeta("addToHistory", false);
        },
      }),
    ];
  },
});
