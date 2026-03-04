import type { RouterOutputs } from "~/trpc/react";

// export function generateBusinessSchema(business: NonNullable<RouterOutputs["business"]["simplifiedGet"]>) {
//     return {
//       "@context": "https://schema.org",
//       "@type":  "LocalBusiness",
//       "name": business.name,
//       "description": business.siteContent?.metaDescription ?? "",
//       "url": business?.customDomain ? `https://${business.customDomain}` : `https://${business.subdomain}.${process.env.NEXT_PUBLIC_DOMAIN}`,
//       "image": business.siteContent?.ogImage ?? "",
//       "address": {
//         "@type": "PostalAddress",
//         "streetAddress": business.streetAddress,
//         "addressLocality": business.city,
//         "addressRegion": business.state,
//         "postalCode": business.zip,
//         "addressCountry": "US",
//       },
//       // Linking social profiles helps Google verify the entity
//       "sameAs": business.socialLinks || [],
//       "founder": {
//         "@type": "Person",
//         "name": business.founderName,
//       },
//       "areaServed": business.serviceArea,
//     };
//   }
