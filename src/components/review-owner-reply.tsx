import { formatDistanceToNow } from "date-fns";

import { cn } from "~/lib/utils";

type ReviewOwnerReplyProps = {
  /** `reply` from `review.listByProduct` rows; `from` is the business name. */
  reply: { text: string; repliedAt: Date | string; from: string } | null;
  classNames?: { root?: string; label?: string; time?: string; text?: string };
};

/**
 * The store owner's public response under a review. Presentational and
 * heading-free so it doesn't disturb the review cards' heading order.
 */
export function ReviewOwnerReply({ reply, classNames }: ReviewOwnerReplyProps) {
  if (!reply) return null;

  // superjson normally yields a Date, but tolerate an ISO string.
  const date = new Date(reply.repliedAt);

  return (
    <div
      className={cn(
        "ml-4 flex flex-col gap-1 border-l-2 border-gray-200 pl-4",
        classNames?.root,
      )}
    >
      <p className={cn("text-sm font-medium text-gray-900", classNames?.label)}>
        Response from {reply.from}
        {" · "}
        <time
          dateTime={date.toISOString()}
          className={cn("font-normal text-gray-500", classNames?.time)}
        >
          {formatDistanceToNow(date, { addSuffix: true })}
        </time>
      </p>
      <p
        className={cn(
          "text-sm whitespace-pre-line text-gray-600",
          classNames?.text,
        )}
      >
        {reply.text}
      </p>
    </div>
  );
}
