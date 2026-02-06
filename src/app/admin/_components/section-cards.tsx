import {
  IconChartBar,
  IconChevronRight,
  IconCurrencyDollar,
  IconHelp,
  IconMail,
} from "@tabler/icons-react";
import Link from "next/link";

import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { env } from "~/env";

const CONTACT_EMAIL = "test@gmail.com";

const cards = [
  {
    title: "Help docs",
    description: "Browse documentation and guides for the admin panel.",
    href: env.NEXT_PUBLIC_HELP_URL,
    icon: IconHelp,
    external: true,
  },
  {
    title: "Donations",
    description: "View the public donation page and manage giving.",
    href: "/donate",
    icon: IconCurrencyDollar,
    external: false,
  },
  {
    title: "Analytics",
    description: "Open your analytics dashboard to view traffic and metrics.",
    href: env.UMAMI_BASE_URL,
    icon: IconChartBar,
    external: true,
  },
  {
    title: "Contact",
    description: "Send an email to get support or share feedback.",
    href: `mailto:${CONTACT_EMAIL}`,
    icon: IconMail,
    external: true,
  },
] as const;

export function SectionCards() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {cards.map((item) => {
        const content = (
          <>
            <CardHeader className="flex flex-row items-start gap-3">
              <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                <item.icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  {item.title}
                  <IconChevronRight className="text-muted-foreground size-4 shrink-0" />
                </CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </div>
            </CardHeader>
            <CardFooter className="text-muted-foreground text-sm">
              {item.external &&
                item.href.startsWith("http") &&
                "Opens in new tab"}
              {item.external &&
                item.href.startsWith("mailto:") &&
                "Opens your email app"}
              {!item.external && "Go to page"}
            </CardFooter>
          </>
        );

        const cardClassName =
          "@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs dark:bg-card transition-colors hover:border-primary/30 hover:bg-primary/5 focus-within:border-primary/30 focus-within:bg-primary/5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:ring-offset-2 focus-within:ring-offset-background";

        if (item.external) {
          return (
            <a
              key={item.title}
              href={item.href}
              target={item.href.startsWith("mailto:") ? undefined : "_blank"}
              rel={
                item.href.startsWith("mailto:")
                  ? undefined
                  : "noopener noreferrer"
              }
              className="block outline-none"
            >
              <Card className={cardClassName}>{content}</Card>
            </a>
          );
        }

        return (
          <Link
            key={item.title}
            href={item.href}
            className="block outline-none"
          >
            <Card className={cardClassName}>{content}</Card>
          </Link>
        );
      })}
    </div>
  );
}
