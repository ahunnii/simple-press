import { Calendar, ShieldCheck, Shovel, Users } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Resident-Led Unity",
    description:
      "A coordinating body for 13+ neighborhood block clubs, empowering residents to lead the revitalization of Detroit’s northeast corridor.",
  },
  {
    icon: ShieldCheck,
    title: "Safety & Stabilization",
    description:
      "Strategic partnerships with the Neighborhood Safety Alliance and local agencies to reduce blight and enhance community security.",
  },
  {
    icon: Shovel,
    title: "Environmental Stewardship",
    description:
      "Active beautification, illegal dumping prevention, and green space activation to restore pride in our residential blocks.",
  },
  {
    icon: Calendar,
    title: "Coordinated Action",
    description:
      "From City Council town halls to weekend neighborhood cleanups, we provide the calendar of events that drives real change.",
  },
];

export function About() {
  return (
    <section id="about" className="bg-card py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <p className="text-primary mb-4 text-sm font-medium">Our Mission</p>
          <h2 className="text-foreground mb-6 text-3xl font-bold text-balance md:text-4xl">
            Strengthening Detroit, One Block at a Time
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Crossroads Community Association (CCA) serves as the central hub for
            resident-led initiatives across our district. We leverage resources,
            advocate for neighborhood improvements, and foster the
            inter-generational collaboration necessary to build a safer,
            cleaner, and more vibrant community.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group bg-background border-border hover:border-primary/30 rounded-2xl border p-6 transition-all duration-300 hover:shadow-lg"
            >
              <div className="bg-primary/10 group-hover:bg-primary/20 mb-4 flex h-12 w-12 items-center justify-center rounded-xl transition-colors">
                <feature.icon className="text-primary h-6 w-6" />
              </div>
              <h3 className="text-foreground mb-2 font-semibold">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
