"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Copy, Inbox, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
import { api } from "~/trpc/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

import {
  TABLE_CARD,
  TABLE_CELL,
  TABLE_HEAD,
} from "../../_components/admin-table-style";
import {
  dismissLoadingToast,
  loadingToast,
} from "../../_lib/admin-mutation-toast";

type FormRow = RouterOutputs["form"]["list"][number];

const BASE_PATH = "/admin/forms";

type Props = {
  forms: FormRow[];
};

export function FormsList({ forms }: Props) {
  const router = useRouter();
  const utils = api.useUtils();

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const afterWrite = () => {
    void utils.form.invalidate();
    router.refresh();
  };

  const deleteMutation = api.form.delete.useMutation({
    onMutate: loadingToast("Deleting form…"),
    onSuccess: (_data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Form deleted");
      setDeleteId(null);
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to delete form");
    },
  });

  const duplicateMutation = api.form.duplicate.useMutation({
    onMutate: loadingToast("Duplicating form…"),
    onSuccess: (_data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Form duplicated");
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message ?? "Failed to duplicate form");
    },
  });

  const deletingForm = forms.find((f) => f.id === deleteId);
  const deletingName = deletingForm?.name ?? "this form";
  const deletingEntryCount = deletingForm?.totalEntries ?? 0;

  return (
    <>
      <Card className={TABLE_CARD}>
        <Table>
          <TableCaption className="sr-only">Forms</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className={TABLE_HEAD}>
                Form
              </TableHead>
              <TableHead
                scope="col"
                className={`hidden md:table-cell ${TABLE_HEAD}`}
              >
                Status
              </TableHead>
              <TableHead
                scope="col"
                className={`hidden md:table-cell ${TABLE_HEAD}`}
              >
                Entries
              </TableHead>
              <TableHead
                scope="col"
                className={`hidden md:table-cell ${TABLE_HEAD}`}
              >
                Updated
              </TableHead>
              <TableHead scope="col" className={`w-12 ${TABLE_HEAD}`}>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {forms.map((form) => (
              <TableRow key={form.id}>
                <TableCell className={TABLE_CELL}>
                  <Link
                    href={`${BASE_PATH}/${form.id}`}
                    className="font-medium hover:underline"
                  >
                    {form.name}
                  </Link>

                  <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm md:hidden">
                    <span>{form.published ? "Published" : "Draft"}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {form.totalEntries}{" "}
                      {form.totalEntries === 1 ? "entry" : "entries"}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Updated{" "}
                      {formatDistanceToNow(new Date(form.updatedAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </TableCell>

                <TableCell className={`hidden md:table-cell ${TABLE_CELL}`}>
                  <Badge variant={form.published ? "success" : "secondary"}>
                    {form.published ? "Published" : "Draft"}
                  </Badge>
                </TableCell>

                <TableCell
                  className={`hidden md:table-cell ${TABLE_CELL}`}
                >
                  <Link
                    href={`${BASE_PATH}/${form.id}/entries`}
                    className="inline-flex items-center gap-2 tabular-nums hover:underline"
                  >
                    {form.totalEntries}
                    {form.unreadCount > 0 && (
                      <Badge variant="default" className="tabular-nums">
                        {form.unreadCount} new
                      </Badge>
                    )}
                  </Link>
                </TableCell>

                <TableCell
                  className={`text-muted-foreground hidden md:table-cell ${TABLE_CELL}`}
                >
                  {formatDistanceToNow(new Date(form.updatedAt), {
                    addSuffix: true,
                  })}
                </TableCell>

                <TableCell className={TABLE_CELL}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Actions for ${form.name}`}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`${BASE_PATH}/${form.id}`}>
                          <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`${BASE_PATH}/${form.id}/entries`}>
                          <Inbox className="mr-2 h-4 w-4" aria-hidden="true" />
                          Entries
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          duplicateMutation.mutate({ id: form.id })
                        }
                        disabled={duplicateMutation.isPending}
                      >
                        <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteId(form.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{`Delete “${deletingName}”?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingEntryCount > 0
                ? `This permanently deletes the form and all ${deletingEntryCount} ${
                    deletingEntryCount === 1 ? "entry" : "entries"
                  } it collected. Export your entries first if you want to keep them. Any page embedding this form will stop showing it.`
                : "This permanently deletes the form. Any page embedding this form will stop showing it."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteId) deleteMutation.mutate({ id: deleteId });
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
