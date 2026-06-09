import type { RouterOutputs } from "~/trpc/react";

export type Product = NonNullable<
  RouterOutputs["business"]["getWithProducts"]
>["products"][number];
