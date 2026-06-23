"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Edit,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";

// ─── Types ────────────────────────────────────────────────────────────────────

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type FaqManagerProps = {
  initialItems: FaqItem[];
};

// ─── Form state ───────────────────────────────────────────────────────────────

type FormState = {
  question: string;
  answer: string;
  published: boolean;
};

const emptyForm: FormState = { question: "", answer: "", published: true };

// ─── Component ────────────────────────────────────────────────────────────────

export function FaqManager({ initialItems }: FaqManagerProps) {
  const router = useRouter();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  // Expanded state for preview
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ─── Mutations ──────────────────────────────────────────────────────────

  const utils = api.useUtils();

  const createMutation = api.faq.create.useMutation({
    onSuccess: () => {
      toast.success("FAQ item added");
      setDialogOpen(false);
      setForm(emptyForm);
      router.refresh();
    },
    onError: (err) => toast.error(err.message || "Failed to create FAQ item"),
  });

  const updateMutation = api.faq.update.useMutation({
    onSuccess: () => {
      toast.success("FAQ item updated");
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      router.refresh();
    },
    onError: (err) => toast.error(err.message || "Failed to update FAQ item"),
  });

  const deleteMutation = api.faq.delete.useMutation({
    onSuccess: () => {
      toast.success("FAQ item deleted");
      router.refresh();
    },
    onError: (err) => toast.error(err.message || "Failed to delete FAQ item"),
  });

  const reorderMutation = api.faq.reorder.useMutation({
    onError: (err) => toast.error(err.message || "Failed to reorder items"),
    onSuccess: () => {
      void utils.faq.adminList.invalidate();
      router.refresh();
    },
  });

  // ─── Handlers ───────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (item: FaqItem) => {
    setEditingId(item.id);
    setForm({
      question: item.question,
      answer: item.answer,
      published: item.published,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error("Question and answer are required");
      return;
    }

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        question: form.question.trim(),
        answer: form.answer.trim(),
        published: form.published,
      });
    } else {
      const nextSortOrder = initialItems.length;
      createMutation.mutate({
        question: form.question.trim(),
        answer: form.answer.trim(),
        published: form.published,
        sortOrder: nextSortOrder,
      });
    }
  };

  const handleDelete = (item: FaqItem) => {
    if (confirm(`Delete "${item.question}"? This cannot be undone.`)) {
      deleteMutation.mutate({ id: item.id });
    }
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const items = [...initialItems];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= items.length) return;

    // Swap
    const a = items[index]!;
    const b = items[targetIndex]!;

    reorderMutation.mutate({
      items: [
        { id: a.id, sortOrder: targetIndex },
        { id: b.id, sortOrder: index },
      ],
    });
  };

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    reorderMutation.isPending;

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Toolbar */}
      <div className="admin-form-toolbar">
        <div className="toolbar-info">
          <Button variant="ghost" size="sm" asChild className="shrink-0">
            <Link href="/admin/content">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <h1 className="text-base font-medium">FAQ</h1>
            <Badge variant="secondary">{initialItems.length} items</Badge>
          </div>
        </div>

        <div className="toolbar-actions">
          <Button onClick={openCreate} disabled={isPending}>
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="admin-container">
        {initialItems.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="mb-2 text-base font-medium text-foreground">
                No FAQ items yet
              </p>
              <p className="mb-6 text-sm text-muted-foreground">
                Add frequently asked questions to help your customers and
                improve search visibility.
              </p>
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Question
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>FAQ Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {initialItems.map((item, index) => (
                  <li key={item.id} className="group px-6 py-4">
                    <div className="flex items-start gap-4">
                      {/* Reorder controls */}
                      <div className="flex shrink-0 flex-col gap-0.5 pt-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground disabled:opacity-30"
                          aria-label="Move up"
                          disabled={index === 0 || isPending}
                          onClick={() => moveItem(index, "up")}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground disabled:opacity-30"
                          aria-label="Move down"
                          disabled={
                            index === initialItems.length - 1 || isPending
                          }
                          onClick={() => moveItem(index, "down")}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Question + answer */}
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 text-left"
                          onClick={() =>
                            setExpandedId(
                              expandedId === item.id ? null : item.id,
                            )
                          }
                          aria-expanded={expandedId === item.id}
                        >
                          <span className="flex-1 text-sm font-medium leading-snug">
                            {item.question}
                          </span>
                          {expandedId === item.id ? (
                            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                        </button>

                        {expandedId === item.id && (
                          <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                            {item.answer}
                          </p>
                        )}

                        <div className="mt-2 flex items-center gap-2">
                          {item.published ? (
                            <Badge
                              variant="default"
                              className="bg-green-600 text-xs"
                            >
                              Published
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Draft
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            #{index + 1}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Edit: ${item.question}`}
                          onClick={() => openEdit(item)}
                          disabled={isPending}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          aria-label={`Delete: ${item.question}`}
                          onClick={() => handleDelete(item)}
                          disabled={isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit FAQ Item" : "Add FAQ Item"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the question and answer."
                : "Add a new frequently asked question to your storefront."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="faq-question">Question</Label>
              <Input
                id="faq-question"
                placeholder="e.g. What is your return policy?"
                value={form.question}
                onChange={(e) =>
                  setForm((f) => ({ ...f, question: e.target.value }))
                }
                maxLength={500}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="faq-answer">Answer</Label>
              <Textarea
                id="faq-answer"
                placeholder="Write a clear, helpful answer..."
                value={form.answer}
                onChange={(e) =>
                  setForm((f) => ({ ...f, answer: e.target.value }))
                }
                rows={5}
                maxLength={10000}
              />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="faq-published"
                checked={form.published}
                onCheckedChange={(v) =>
                  setForm((f) => ({ ...f, published: v }))
                }
              />
              <Label htmlFor="faq-published" className="cursor-pointer">
                Published
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isPending ||
                !form.question.trim() ||
                !form.answer.trim()
              }
            >
              {editingId ? "Save Changes" : "Add Question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
