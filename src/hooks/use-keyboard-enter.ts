/* eslint-disable @typescript-eslint/no-explicit-any */
import type { UseFormReturn } from "react-hook-form";
import { useEffect, useRef } from "react";

export function useKeyboardEnter(
  form: UseFormReturn<any>,
  onSubmit: (data: any) => Promise<void>,
  onInvalid?: (errors: any) => void,
) {
  // Store the latest onSubmit in a ref to avoid stale closures
  const onSubmitRef = useRef(onSubmit);
  const onInvalidRef = useRef(onInvalid);

  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  useEffect(() => {
    onInvalidRef.current = onInvalid;
  }, [onInvalid]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!((e.metaKey || e.ctrlKey) && e.key === "Enter")) return;

      // Respect components (e.g. rich-text editors like Tiptap) that already
      // handled Cmd/Ctrl+Enter themselves and called preventDefault() — a
      // global listener shouldn't also trigger a form submit on top of
      // whatever that shortcut was meant to do.
      if (e.defaultPrevented) return;

      // Don't hijack Cmd/Ctrl+Enter while focus is inside a contenteditable
      // region (e.g. a Tiptap/ProseMirror rich-text editor). Those editors
      // commonly bind their own Cmd/Ctrl+Enter behavior (or expect the
      // keystroke to just insert a newline/be a no-op), and this hook has no
      // business intercepting keystrokes meant for an editor rather than the
      // surrounding form.
      //
      // Note: we deliberately don't do strict `<form>`-DOM-containment
      // checking here. Several consumers of this hook (e.g. product-form,
      // discount-form) render Radix Select/Popover content into a portal
      // attached to `document.body`, outside the `<form>` element's DOM
      // subtree — a containment check would incorrectly block submission
      // whenever focus is inside one of those portals.
      const target = e.target;
      if (target instanceof Element) {
        const editable = target.closest(
          '[contenteditable="true"], [contenteditable=""]',
        );
        if (editable) return;
      }

      void form.handleSubmit(onSubmitRef.current, onInvalidRef.current)();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [form]);
}
