import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";

import { Button } from "~/components/ui/button";

export interface BulkAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  pending?: boolean;
  /**
   * `destructive` renders as an outline button with destructive text and border,
   * NOT a solid red fill. This bar is on screen the entire time anything is
   * selected, so a saturated block would shout through all ordinary selection
   * work about an action the user mostly isn't taking. Solid red is reserved for
   * the confirm dialog's final button, where the commitment actually happens —
   * quiet until committed.
   */
  variant?: "outline" | "destructive";
}

export interface AdminBulkBarSelectAllMatching {
  total: number;
  onSelect: () => void;
  /** true once the user has escalated — bar then reads "All N selected" */
  isEscalated: boolean;
  /** e.g. exceeds the 1000-id server cap — shown instead of the escalation link */
  disabledReason?: string;
}

export interface AdminBulkBarProps {
  count: number;
  itemNoun: { one: string; many: string };
  actions: BulkAction[];
  onClear: () => void;
  /** Optional "select all N matching" escalation, shown when the current page is fully selected
   *  and more matches exist beyond it. */
  selectAllMatching?: AdminBulkBarSelectAllMatching;
  disabled?: boolean;
}

export function AdminBulkBar({
  count,
  itemNoun,
  actions,
  onClear,
  selectAllMatching,
  disabled,
}: AdminBulkBarProps) {
  if (count === 0) return null;

  const noun = count === 1 ? itemNoun.one : itemNoun.many;
  const countLabel = selectAllMatching?.isEscalated
    ? `All ${selectAllMatching.total} ${
        selectAllMatching.total === 1 ? itemNoun.one : itemNoun.many
      } selected`
    : `${count} ${noun} selected`;

  return (
    <div className="bg-card sticky top-0 z-30 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-2 shadow-sm">
      <span
        role="status"
        aria-live="polite"
        className="text-foreground text-sm font-medium"
      >
        {countLabel}
      </span>

      {selectAllMatching && !selectAllMatching.isEscalated && (
        <>
          {selectAllMatching.disabledReason ? (
            <span className="text-muted-foreground text-sm">
              {selectAllMatching.disabledReason}
            </span>
          ) : (
            <button
              type="button"
              onClick={selectAllMatching.onSelect}
              disabled={disabled}
              className="text-primary text-sm font-medium underline-offset-4 hover:underline disabled:pointer-events-none disabled:opacity-50"
            >
              Select all {selectAllMatching.total} {itemNoun.many}
            </button>
          )}
        </>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              size="sm"
              // Always an outline button — a destructive action is tinted, not
              // filled. See the note on BulkAction.variant.
              variant="outline"
              className={
                action.variant === "destructive"
                  ? "border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  : undefined
              }
              // Either flag disables. Deliberately not `disabled ?? action.pending`:
              // `??` only falls through on null/undefined, so a bar-level
              // `disabled={false}` would suppress this action's own pending state.
              disabled={disabled === true || action.pending === true}
              onClick={action.onClick}
            >
              {action.pending ? <Loader2 className="animate-spin" /> : <Icon />}
              {action.label}
            </Button>
          );
        })}
        <Button size="sm" variant="ghost" onClick={onClear} disabled={disabled}>
          Clear
        </Button>
      </div>
    </div>
  );
}
