"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle,
  ExternalLink,
  Loader2,
  Save,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import type { QboDepositMode } from "~/lib/validators/quickbooks";
import type { RouterOutputs } from "~/trpc/react";
import { formatDate } from "~/lib/format-date";
import { centsToDollarsString, dollarsToCents } from "~/lib/prices";
import { QBO_APP_BASE } from "~/lib/quickbooks/constants";
import { cn } from "~/lib/utils";
import { quickBooksSettingsSchema } from "~/lib/validators/quickbooks";
import { api } from "~/trpc/react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { NumberInput } from "~/components/ui/number-input";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
  disconnectQuickBooks,
  QuickBooksConnectError,
  startQuickBooksConnect,
} from "~/app/admin/_components/quickbooks/quickbooks-connect-utils";
import {
  dismissLoadingToast,
  loadingToast,
} from "~/app/admin/_lib/admin-mutation-toast";

type QuickBooksConnectionData = RouterOutputs["quickbooks"]["getConnection"];
type QboConnection = NonNullable<QuickBooksConnectionData["connection"]>;

type Props = {
  businessId: string;
  data: QuickBooksConnectionData;
};

type ConnectionStatus =
  | "not_configured"
  | "not_connected"
  | "needs_reconnect"
  | "connected";

function connectErrorMessage(err: QuickBooksConnectError): string {
  switch (err.code) {
    case "not_configured":
      return "QuickBooks isn't configured on this platform yet. Ask your SimplePress administrator to add the Intuit app credentials.";
    case "feature_disabled":
      return "QuickBooks isn't enabled for this store.";
    case "forbidden":
    case "unauthorized":
      return "You don't have permission to connect QuickBooks.";
    default:
      return "Couldn't start the QuickBooks connection.";
  }
}

export function QuickBooksSettings({ businessId, data }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const conn = data.connection;
  const status: ConnectionStatus = !data.platformConfigured
    ? "not_configured"
    : !conn || conn.status === "disconnected"
      ? "not_connected"
      : conn.status === "needs_reconnect"
        ? "needs_reconnect"
        : "connected";

  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Consume the redirect-back params from the OAuth callback exactly once on
  // mount, then strip them so a page reload (or the disconnect flow's own
  // `window.location.reload()`) can't re-fire the same toast.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("quickbooks");
    const errorCode = params.get("quickbooks_error");

    if (!connected && !errorCode) return;

    if (connected === "connected") {
      toast.success("QuickBooks connected");
    } else if (errorCode) {
      toast.error(
        errorCode === "access_denied"
          ? "QuickBooks connection was cancelled"
          : "QuickBooks connection failed",
      );
    }

    params.delete("quickbooks");
    params.delete("quickbooks_error");
    const rest = params.toString();
    router.replace(rest ? `${pathname}?${rest}` : pathname);
    // Intentionally run once: this drains the one-time redirect params, not a
    // reaction to `pathname`/`router` identity changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      // Navigates the browser away to Intuit on success, so `connecting`
      // only ever needs to be unset again on the error path.
      await startQuickBooksConnect({ businessId });
    } catch (err) {
      setConnecting(false);
      toast.error(
        err instanceof QuickBooksConnectError
          ? connectErrorMessage(err)
          : "Couldn't start the QuickBooks connection.",
      );
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectQuickBooks(businessId);
      toast.success("QuickBooks disconnected");
      window.location.reload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to disconnect QuickBooks",
      );
      setDisconnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpenCheck className="h-4 w-4" />
              QuickBooks Online
              {data.environment === "sandbox" && (
                <Badge variant="outline">Sandbox</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Send deposit and final invoices from your quote leads through your
              QuickBooks Online company. Customers pay through QuickBooks&apos;
              own invoice email.
            </CardDescription>
          </div>

          {status === "connected" && (
            <Badge variant="default" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Connected
            </Badge>
          )}
          {status === "needs_reconnect" && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Needs reconnect
            </Badge>
          )}
          {status === "not_connected" && (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="h-3 w-3" />
              Not connected
            </Badge>
          )}
          {status === "not_configured" && (
            <Badge variant="secondary" className="gap-1">
              Not configured
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {status === "not_configured" && (
          <>
            <p className="text-muted-foreground text-sm">
              QuickBooks isn&apos;t configured on this platform yet. Ask your
              SimplePress administrator to add the Intuit app credentials.
            </p>
            <Button disabled>Connect QuickBooks</Button>
          </>
        )}

        {status === "not_connected" && (
          <>
            <p className="text-muted-foreground text-sm">
              Connect the QuickBooks Online company you invoice from.
              SimplePress will create customers and invoices there; money never
              passes through SimplePress.
            </p>
            <Button onClick={() => void handleConnect()} disabled={connecting}>
              {connecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect QuickBooks"
              )}
            </Button>
          </>
        )}

        {status === "needs_reconnect" && (
          <>
            <Alert variant="destructive" className="border-destructive/50">
              <AlertTriangle />
              <AlertTitle>Reconnect QuickBooks</AlertTitle>
              <AlertDescription>
                QuickBooks no longer accepts our saved authorization (Intuit
                connections expire after about 100 days or when access is
                revoked in QuickBooks). Invoices can&apos;t be sent until you
                reconnect.
              </AlertDescription>
            </Alert>

            {conn && (conn.companyName ?? conn.realmId) ? (
              <p className="text-muted-foreground text-sm">
                {conn.companyName ?? "—"}{" "}
                <span className="font-mono">({conn.realmId})</span>
              </p>
            ) : null}

            <Button onClick={() => void handleConnect()} disabled={connecting}>
              {connecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reconnecting...
                </>
              ) : (
                "Reconnect"
              )}
            </Button>
          </>
        )}

        {status === "connected" && conn && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Company</label>
                <div className="bg-muted mt-1 rounded border p-3 text-sm">
                  {conn.companyName ?? "—"}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Company ID</label>
                <div className="bg-muted mt-1 rounded border p-3 font-mono text-sm">
                  {conn.realmId}
                </div>
              </div>
            </div>

            <div>
              <p className="text-muted-foreground text-sm">
                Connected since {formatDate(conn.connectedAt)}
                {conn.lastSyncAt
                  ? ` · Last synced ${formatDate(conn.lastSyncAt)}`
                  : ""}
              </p>
              {conn.lastSyncError && (
                <p className="text-destructive mt-1 text-xs">
                  {conn.lastSyncError}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`${QBO_APP_BASE[data.environment]}/app/homepage`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open QuickBooks
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={disconnecting}
                  >
                    {disconnecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      "Disconnect"
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect QuickBooks?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your existing invoices stay in QuickBooks and in
                      SimplePress; you just won&apos;t be able to send new ones
                      until you reconnect. Deposit settings are kept.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={disconnecting}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={disconnecting}
                      onClick={(e) => {
                        e.preventDefault();
                        void handleDisconnect();
                      }}
                    >
                      {disconnecting ? "Disconnecting…" : "Disconnect"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="border-t pt-6">
              <DepositDefaultsForm conn={conn} />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DepositDefaultsForm({ conn }: { conn: QboConnection }) {
  const router = useRouter();

  const [depositMode, setDepositMode] = useState<QboDepositMode>(
    conn.depositMode === "fixed" ? "fixed" : "percent",
  );
  const [depositPercent, setDepositPercent] = useState<number | null>(
    conn.depositPercent,
  );
  const [depositFixedInput, setDepositFixedInput] = useState(
    centsToDollarsString(conn.depositFixedCents) || "0.00",
  );
  const [defaultDueDays, setDefaultDueDays] = useState<number | null>(
    conn.defaultDueDays,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const updateSettings = api.quickbooks.updateSettings.useMutation({
    onMutate: loadingToast("Saving deposit defaults..."),
    onSuccess: (_data, _vars, context) => {
      dismissLoadingToast(context);
      toast.success("Deposit defaults saved");
      router.refresh();
    },
    onError: (error, _vars, context) => {
      dismissLoadingToast(context);
      toast.error(error.message || "Failed to save deposit defaults");
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsed = quickBooksSettingsSchema.safeParse({
      depositMode,
      depositPercent: depositPercent ?? 0,
      depositFixedCents: dollarsToCents(depositFixedInput || "0"),
      defaultDueDays: defaultDueDays ?? 0,
    });

    if (!parsed.success) {
      setFormError(
        parsed.error.issues[0]?.message ?? "Check the values below.",
      );
      return;
    }

    updateSettings.mutate(parsed.data);
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Deposit defaults</h3>
        <p className="text-muted-foreground text-sm">
          These prefill the Send deposit invoice dialog on each quote lead — you
          can always change the amount per invoice.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Deposit amount</Label>
        <RadioGroup
          value={depositMode}
          onValueChange={(value) => setDepositMode(value as QboDepositMode)}
          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6"
        >
          <label
            htmlFor="deposit-mode-percent"
            className="flex items-center gap-2 text-sm font-normal"
          >
            <RadioGroupItem value="percent" id="deposit-mode-percent" />
            Percent of quote
          </label>
          <label
            htmlFor="deposit-mode-fixed"
            className="flex items-center gap-2 text-sm font-normal"
          >
            <RadioGroupItem value="fixed" id="deposit-mode-fixed" />
            Fixed amount
          </label>
        </RadioGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {depositMode === "percent" ? (
          <div>
            <Label htmlFor="deposit-percent">Deposit percent</Label>
            <div className="relative mt-1 max-w-[160px]">
              <NumberInput
                id="deposit-percent"
                min={1}
                max={100}
                value={depositPercent}
                onChange={setDepositPercent}
                className={cn("pr-7")}
              />
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                %
              </span>
            </div>
          </div>
        ) : (
          <div>
            <Label htmlFor="deposit-fixed">Deposit amount</Label>
            <div className="relative mt-1 max-w-[160px]">
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                $
              </span>
              <Input
                id="deposit-fixed"
                inputMode="decimal"
                value={depositFixedInput}
                onChange={(e) => setDepositFixedInput(e.target.value)}
                onBlur={() =>
                  setDepositFixedInput(
                    centsToDollarsString(dollarsToCents(depositFixedInput)) ||
                      "0.00",
                  )
                }
                className={cn("pl-6")}
              />
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="default-due-days">Invoice due in (days)</Label>
          <NumberInput
            id="default-due-days"
            min={0}
            max={90}
            value={defaultDueDays}
            onChange={setDefaultDueDays}
            className="mt-1 max-w-[120px]"
          />
        </div>
      </div>

      {formError && (
        <p className="text-destructive text-sm" role="alert">
          {formError}
        </p>
      )}

      <Button type="submit" disabled={updateSettings.isPending}>
        {updateSettings.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save
          </>
        )}
      </Button>
    </form>
  );
}
