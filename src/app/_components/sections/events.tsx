import type { Event } from "generated/prisma";
import { ArrowRight, Calendar, Clock, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button, buttonVariants } from "~/components/ui/button";

type Props = { events: Event[] };

export function Events({ events }: Props) {
  return (
    <section id="events" className="py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-primary mb-4 text-sm font-medium tracking-wider uppercase">
              Community Calendar
            </p>
            <h2 className="text-foreground text-3xl font-bold text-balance md:text-4xl">
              Take Action in Your Neighborhood
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xl">
              From neighborhood cleanups to safety strategy sessions, join your
              local block club in making a tangible difference.
            </p>
          </div>
          <Link
            href="/events"
            className={buttonVariants({
              variant: "outline",
              className: "gap-2 self-start bg-transparent md:self-auto",
            })}
          >
            View All Events
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => {
            const startTime = event.startTime.toLocaleTimeString();
            const endTime = event.endTime.toLocaleTimeString();
            const startDate = event.startTime.toLocaleDateString();
            const endDate = event.endTime.toLocaleDateString();
            const date =
              startDate === endDate ? startDate : `${startDate} — ${endDate}`;
            return (
              <div
                key={event.name}
                className="group border-border bg-card overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-xl"
              >
                <div className="relative aspect-4/3 overflow-hidden">
                  <Image
                    src={event?.mediaUrl ?? "/placeholder.svg"}
                    alt={event.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    fill
                    sizes="100vw"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-background/90 text-foreground rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm">
                      {event.category}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-foreground group-hover:text-primary mb-4 truncate overflow-hidden text-lg font-semibold whitespace-nowrap transition-colors">
                    {event.name}
                  </h3>
                  <div className="text-muted-foreground space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="text-primary h-4 w-4" />
                      <span>{date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="text-primary h-4 w-4" />
                      <span>
                        {startTime} - {endTime}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="text-primary h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                  </div>
                  <Link
                    href={`/events/${event.id}`}
                    className={buttonVariants({
                      variant: "ghost",
                      size: "sm",
                      className:
                        "text-primary hover:text-primary-foreground mt-4 -ml-2 gap-1",
                    })}
                  >
                    Learn More
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
