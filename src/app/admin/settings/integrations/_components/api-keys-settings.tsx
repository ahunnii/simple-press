"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { AlertTriangle, Check, Copy, KeyRound, Loader2 } from "lucide-react";
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
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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

type ApiKey = RouterOutputs["apiToken"]["list"][number];
type CreatedKey = RouterOutputs["apiToken"]["create"];

type Props = {
  /** Server-fetched list; the card keeps it fresh with its own query after that. */
  initialKeys: ApiKey[];
};

/**
 * Settings → Integrations → "API keys". Only rendered for the store owner and
 * platform admins (the page passes nothing for anyone else); every
 * `apiToken.*` procedure enforces the same rule server-side.
 *
 * The dialogs are siblings of the card content, never inside a <form>: they
 * portal to <body> but React still bubbles submit events through the React
 * tree, so nesting them in a parent form would submit that form.
 */
export function ApiKeysSettings({ initialKeys }: Props) {
  const utils = api.useUtils();
  const { data: keys = initialKeys } = api.apiToken.list.useQuery(undefined, {
    initialData: initialKeys,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<CreatedKey | null>(null);
  const [copiedField, setCopiedField] = useState<"token" | "url" | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);

  const createMutation = api.apiToken.create.useMutation({
    onSuccess: async (result) => {
      setCreated(result);
      setName("");
      await utils.apiToken.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message ?? "Couldn't create the key");
    },
  });

  const revokeMutation = api.apiToken.revoke.useMutation({
    onSuccess: async () => {
      toast.success("Key revoked");
      setRevokeTarget(null);
      await utils.apiToken.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message ?? "Couldn't revoke the key");
    },
  });

  const openCreate = () => {
    setName("");
    setCreated(null);
    setCopiedField(null);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    // Drop the raw key from memory as soon as the dialog is gone.
    setCreated(null);
    setCopiedField(null);
  };

  const copy = (field: "token" | "url", value: string) => {
    navigator.clipboard.writeText(value).then(
      () => {
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
      },
      () => toast.error("Couldn't copy — select the text and copy it instead"),
    );
  };

  const trimmedName = name.trim();
  const hasActiveKeys = keys.some((k) => !k.revokedAt);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>API keys</CardTitle>
              <CardDescription>
                Let another app, like ProfitMax, read your store&apos;s public
                business details and catalog — name, location, hours, products,
                prices, services, and FAQs. Keys can&apos;t see orders,
                customers, or payments.
              </CardDescription>
            </div>
            <Button type="button" onClick={openCreate} className="shrink-0">
              <KeyRound className="mr-2 h-4 w-4" />
              Create key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No keys yet. Create one when an app asks for it.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {keys.map((key) => {
                const revoked = !!key.revokedAt;
                return (
                  <li
                    key={key.id}
                    className="flex items-center justify-between gap-4 p-3"
                  >
                    <div className={revoked ? "min-w-0 opacity-60" : "min-w-0"}>
                      <p className="truncate text-sm font-medium">{key.name}</p>
                      <p className="text-muted-foreground text-xs">
                        <code>{key.prefix}…</code>
                        {" · "}Created {format(key.createdAt, "MMM d, yyyy")}
                        {" · "}
                        {revoked && key.revokedAt
                          ? `Revoked ${format(key.revokedAt, "MMM d, yyyy")}`
                          : key.lastUsedAt
                            ? `Last used ${formatDistanceToNow(key.lastUsedAt, { addSuffix: true })}`
                            : "Last used: Never"}
                      </p>
                    </div>
                    {revoked ? null : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setRevokeTarget(key)}
                      >
                        Revoke
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {keys.length > 0 && !hasActiveKeys ? (
            <p className="text-muted-foreground mt-3 text-sm">
              All of your keys are revoked, so no app can read your store right
              now.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* Create key / show-once dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) closeCreate();
        }}
      >
        <DialogContent
          // While the key is on screen it can't be recovered, so a stray
          // click outside or Escape must not dismiss it — "Done" does.
          onInteractOutside={(e) => {
            if (created) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (created) e.preventDefault();
          }}
        >
          {created ? (
            <>
              <DialogHeader>
                <DialogTitle>Your new key</DialogTitle>
                <DialogDescription>
                  Paste the key and your site address into the app you&apos;re
                  connecting.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Copy this now — you won&apos;t be able to see it again.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="api-key-value">Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="api-key-value"
                      readOnly
                      value={created.token}
                      className="font-mono text-xs"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => copy("token", created.token)}
                    >
                      {copiedField === "token" ? (
                        <Check className="mr-2 h-4 w-4" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      {copiedField === "token" ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="api-key-site">Site address</Label>
                  <div className="flex gap-2">
                    <Input
                      id="api-key-site"
                      readOnly
                      value={created.siteUrl}
                      className="font-mono text-xs"
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => copy("url", created.siteUrl)}
                    >
                      {copiedField === "url" ? (
                        <Check className="mr-2 h-4 w-4" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      {copiedField === "url" ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" onClick={closeCreate}>
                  Done
                </Button>
              </DialogFooter>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!trimmedName || createMutation.isPending) return;
                createMutation.mutate({ name: trimmedName });
              }}
              className="space-y-4"
            >
              <DialogHeader>
                <DialogTitle>Create an API key</DialogTitle>
                <DialogDescription>
                  Name it after the app that will use it, so you can tell your
                  keys apart later.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-1.5">
                <Label htmlFor="api-key-name">Name</Label>
                <Input
                  id="api-key-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ProfitMax"
                  maxLength={60}
                  autoFocus
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeCreate}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!trimmedName || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create key"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation */}
      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {revokeTarget ? `Revoke "${revokeTarget.name}"?` : "Revoke key?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apps using this key will stop working right away.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={revokeMutation.isPending}
              onClick={(e) => {
                // Keep the dialog open until the mutation settles.
                e.preventDefault();
                if (revokeTarget) {
                  revokeMutation.mutate({ id: revokeTarget.id });
                }
              }}
            >
              {revokeMutation.isPending ? "Revoking…" : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
