import { cn } from "~/lib/utils";
import { FacebookIcon } from "~/components/icons/facebook-icon";
import { PinterestIcon } from "~/components/icons/pinterest-icon";

type GloveShareRowProps = {
  /** Absolute URL of the page being shared. */
  url: string;
  /** Title/text for the post. */
  title: string;
  /** Optional absolute image URL (Pinterest). */
  image?: string;
  className?: string;
  /** Visible lead-in label, e.g. "Share". Blank hides it. */
  label?: string;
};

/** The X logo (currentColor); the shared TwitterIcon is still the old bird. */
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

/** Facebook / X / Pinterest share links in the square social-button style. */
export function GloveShareRow({
  url,
  title,
  image,
  className,
  label = "Share",
}: GloveShareRowProps) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      Icon: FacebookIcon,
    },
    {
      name: "X",
      href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
      Icon: XIcon,
    },
    {
      name: "Pinterest",
      href: `https://pinterest.com/pin/create/button/?url=${u}&description=${t}${image ? `&media=${encodeURIComponent(image)}` : ""}`,
      Icon: PinterestIcon,
    },
  ];
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label ? (
        <span className="glove-display text-[13px] font-medium text-[var(--glove-ink)]">
          {label}
        </span>
      ) : null}
      <ul className="m-0 flex list-none items-center gap-2 p-0">
        {links.map(({ name, href, Icon }) => (
          <li key={name}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="glove-social-btn"
            >
              <Icon className="size-4 stroke-2 text-[var(--glove-primary)]" />
              <span className="sr-only">
                Share on {name} (opens in new tab)
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
