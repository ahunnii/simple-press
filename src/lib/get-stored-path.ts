export function getStoredPath(file: {
  objectInfo?: {
    key?: string;
    path?: string;
    metadata?: { pathName?: string };
  };
}): string {
  console.log(file.objectInfo);
  return (
    file.objectInfo?.metadata?.pathName ??
    file.objectInfo?.key ??
    (file.objectInfo as { path?: string })?.path ??
    ""
  );
}
