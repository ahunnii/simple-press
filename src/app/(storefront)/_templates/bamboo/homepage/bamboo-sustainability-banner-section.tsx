import type { GenericIconRow } from "~/lib/template-fields";
import { StaggerContainer, StaggerItem } from "~/components/page-animations";

type Props = {
  sustainabilityList: GenericIconRow[];
};

export function BambooSustainabilityBanner({ sustainabilityList }: Props) {
  return (
    <section className="bg-primary">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <StaggerContainer
          className="grid grid-cols-2 gap-8 lg:grid-cols-3"
          staggerDelay={0.1}
        >
          {sustainabilityList.map((feature) => (
            <StaggerItem
              key={feature.title}
              className="flex flex-col items-center gap-3 text-center"
            >
              <div className="bg-primary-foreground/10 flex size-12 items-center justify-center rounded-full">
                <feature.icon className="text-primary-foreground size-6" />
              </div>
              <h3 className="text-primary-foreground text-sm font-semibold">
                {feature.title}
              </h3>
              <p className="text-primary-foreground/70 text-xs">
                {feature.description}
              </p>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
