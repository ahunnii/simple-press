"use client";

import { ArrowRight, User } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarGroup } from "~/components/ui/avatar";
import { buttonVariants } from "~/components/ui/button";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export function Hero({ title }: { title: string }) {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-32">
      <div className="from-primary/5 via-background to-background absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div
            className="space-y-8"
            variants={stagger}
            initial="initial"
            animate="animate"
          >
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium"
            >
              <span className="bg-primary h-2 w-2 animate-pulse rounded-full" />
              Serving Detroit&apos;s Northeast Corridor
            </motion.div>

            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-foreground text-4xl leading-tight font-bold text-balance md:text-5xl lg:text-6xl"
            >
              {title}
            </motion.h1>

            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-muted-foreground max-w-xl text-lg leading-relaxed"
            >
              Crossroads Community Association (CCA) is the heartbeat of
              resident-led revitalization. Join 13+ block clubs dedicated to
              neighborhood safety, stewardship, and inter-generational growth.
            </motion.p>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="flex flex-col gap-4 sm:flex-row"
            >
              <Link
                href="/auth/sign-up"
                data-umami-event="Join CCA link clicked"
                className={buttonVariants({ size: "lg", className: "gap-2" })}
              >
                Join CCA Today
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                data-umami-event="Report a Concern link clicked"
                className={buttonVariants({ size: "lg", variant: "outline" })}
              >
                Report a Concern
              </Link>
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="flex items-center gap-6 pt-4"
            >
              <AvatarGroup className="-space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <Avatar key={i} size="lg">
                    <AvatarFallback>
                      <User className="size-5" />
                    </AvatarFallback>
                  </Avatar>
                ))}
              </AvatarGroup>
              <div>
                <p className="text-foreground text-sm font-semibold">
                  13 Active Block Clubs
                </p>
                <p className="text-muted-foreground text-xs">
                  Coordinating Neighborhood Action
                </p>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.3,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <motion.div
                  className="bg-muted relative aspect-4/5 overflow-hidden rounded-2xl"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.45,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                >
                  <Image
                    src="https://images.unsplash.com/photo-1758426637884-8d27c12b2741?w=400&h=500&fit=crop"
                    alt="Building with a flower mural on the side"
                    className="h-full w-full object-cover"
                    fill
                    sizes="100vw"
                    priority
                  />
                </motion.div>
                <motion.div
                  className="bg-primary/10 flex aspect-square flex-col justify-end rounded-2xl p-6"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.55,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                >
                  <p className="text-primary text-3xl font-bold">100%</p>
                  <p className="text-muted-foreground text-sm leading-tight">
                    Resident-Led Initiatives
                  </p>
                </motion.div>
              </div>
              <div className="space-y-4 pt-8">
                <motion.div
                  className="bg-accent/50 flex aspect-square flex-col justify-end rounded-2xl p-6"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.4,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                >
                  <p className="text-foreground text-3xl font-bold">
                    District 3
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Focused Advocacy in Detroit
                  </p>
                </motion.div>
                <motion.div
                  className="bg-muted relative aspect-4/5 overflow-hidden rounded-2xl"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.5,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                >
                  <Image
                    src="https://images.unsplash.com/photo-1621951809336-18bec68a5f01?w=400&h=500&fit=crop"
                    alt="A happy father lifting his daughter up in the air for sunset"
                    className="h-full w-full object-cover"
                    fill
                    sizes="100vw"
                    priority
                  />
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
