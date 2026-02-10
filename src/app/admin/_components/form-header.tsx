"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MoreVertical, Trash2 } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

type Props = {
  isDirty: boolean;
  isSubmitting: boolean;
  onDelete: (() => void) | undefined;
  isUploading: boolean;
  title: string;
  backUrl: string;
  submitActionText: string;
  onSubmit: () => void;
};
export function FormHeader({
  isDirty,
  isSubmitting,
  onDelete,
  isUploading,
  title,
  backUrl,
  submitActionText,
  onSubmit,
}: Props) {
  const router = useRouter();
  const handleReset = () => {
    router.refresh();
  };
  return (
    <div className="border-border/30 sticky top-0 z-10 -mx-4 -mt-4 flex w-[calc(100%+2rem)] justify-center border-b px-4 py-3 transition-all duration-300 md:-mx-6 md:w-[calc(100%+3rem)] md:px-6">
      <div
        className={`flex w-[90%] items-center justify-between gap-2 rounded-full border px-4 py-3 shadow-sm backdrop-blur transition-all duration-300 ${
          isDirty
            ? "bg-background/95 supports-backdrop-filter:bg-background/80 border-amber-200 shadow-md dark:border-amber-800"
            : "border-border/50 bg-background/60 supports-backdrop-filter:bg-background/50"
        }`}
      >
        <Button variant="ghost" size="sm" asChild className="shrink-0">
          <Link href={backUrl}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isSubmitting}
                className="text-muted-foreground hover:text-destructive"
                aria-label="More options"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
                disabled={isSubmitting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {title}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={handleReset}
          >
            Reset
          </Button>
          <Button type="button" disabled={isSubmitting} onClick={onSubmit}>
            {isSubmitting ? (
              <>
                <span className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2" />
                {isUploading ? "Uploading..." : "Saving..."}
              </>
            ) : (
              submitActionText
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
