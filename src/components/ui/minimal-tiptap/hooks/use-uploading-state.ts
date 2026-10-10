import * as React from "react";

/**
 * Combines the `onUploadingChange` reports of any number of rich-text editors
 * into one flag for a form's Save button. Pass `onUploadingChange` to every
 * editor (or `MinimalTiptapFormField`) in the form; `isUploading` stays true
 * while any of them still has an image or video upload in flight.
 */
export function useUploadingState() {
  const [count, setCount] = React.useState(0);
  const onUploadingChange = React.useCallback((uploading: boolean) => {
    setCount((current) => Math.max(0, current + (uploading ? 1 : -1)));
  }, []);
  return { isUploading: count > 0, onUploadingChange };
}
