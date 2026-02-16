import Image from "next/image";

// import { SubmitTestimonialClient } from "./_components/submit-testimonial-client";

export const metadata = {
  title: "Submit a Testimonial",
  description:
    "Share your experience with Detroit Pollinator Company. Your feedback helps others discover our pollinator garden design and green space services.",
};

export default function SubmitTestimonialPage() {
  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 md:py-32">
        <Image
          src="https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1920&h=600&fit=crop"
          alt=""
          fill
          className="object-cover blur-sm brightness-75"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-[#2a351f]/90" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-4 text-sm font-medium tracking-wider text-[#A8D081] uppercase">
            Share Your Story
          </p>
          <h1 className="text-5xl font-bold text-white md:text-6xl lg:text-7xl">
            Submit a Testimonial
          </h1>
        </div>
      </section>

      {/* <SubmitTestimonialClient /> */}
    </div>
  );
}
