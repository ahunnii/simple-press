"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Clock, ExternalLink, XCircle } from "lucide-react";
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
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

type DomainQueueEntry = RouterOutputs["platform"]["listDomainQueue"][number];

type Props = {
  entries: DomainQueueEntry[];
};

export function DomainQueueTable({ entries }: Props) {
  const router = useRouter();
  const [actioningId, setActioningId] = useState<string | null>(null);

  const updateStatus = api.platform.updateDomainStatus.useMutation({
    onMutate: () => {
      toast.loading("Updating domain...");
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success("Domain updated");
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      toast.error(err.message ?? "Failed to update domain");
    },
    onSettled: () => {
      setActioningId(null);
    },
  });

  const handleMarkActive = (businessId: string) => {
    setActioningId(businessId);
    updateStatus.mutate({ businessId, domainStatus: "ACTIVE" });
  };

  const handleRemove = (businessId: string) => {
    setActioningId(businessId);
    updateStatus.mutate({ businessId, domainStatus: "NONE" });
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const domainStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Active
          </Badge>
        );
      case "PENDING_DNS":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending DNS
          </Badge>
        );
      default:
        return <Badge variant="outline">None</Badge>;
    }
  };

  if (entries.length === 0) {
    return (
      <Card className="text-muted-foreground p-12 text-center">
        No pending domain requests.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <caption className="sr-only">Domain queue entries</caption>
          <thead className="bg-muted border-b">
            <tr>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Business
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Custom Domain
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Queue Status
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Domain Status
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Requested
              </th>
              <th
                scope="col"
                className="text-muted-foreground px-6 py-3 text-left text-xs font-medium tracking-wider uppercase"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.map((entry) => {
              const isActioning = actioningId === entry.businessId;
              const b = entry.business;

              return (
                <tr key={entry.id} className="hover:bg-muted/50">
                  <td className="px-6 py-4">
                    <div className="text-foreground font-medium">
                      {b?.name ?? "Unknown"}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {b?.ownerEmail}
                    </div>
                    <div className="text-muted-foreground/70 mt-0.5 font-mono text-xs">
                      {b?.subdomain}.{process.env.NEXT_PUBLIC_PLATFORM_DOMAIN}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 font-mono text-sm">
                      {entry.domain}
                      <a
                        href={`https://${entry.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground/60 hover:text-blue-600"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    {entry.lastError && (
                      <div className="text-destructive mt-1 text-xs">
                        {entry.lastError}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">{statusBadge(entry.status)}</td>
                  <td className="px-6 py-4">
                    {domainStatusBadge(b?.domainStatus ?? "NONE")}
                  </td>
                  <td className="text-muted-foreground px-6 py-4 text-sm">
                    {new Date(entry.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        disabled={isActioning}
                        onClick={() => handleMarkActive(entry.businessId)}
                      >
                        Mark Active
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isActioning}
                          >
                            Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Domain?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will clear <strong>{entry.domain}</strong>{" "}
                              from <strong>{b?.name}</strong> and reset their
                              domain status to None. The business owner will
                              need to re-add their domain. This cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleRemove(entry.businessId)}
                            >
                              Remove Domain
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
