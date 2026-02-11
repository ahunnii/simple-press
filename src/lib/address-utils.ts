import { db } from "~/server/db";

// Helper: normalize address for comparison (ignore case/whitespace)
export function normalizeAddress(addr: {
  firstName: string;
  lastName: string;
  company?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  province: string;
  zip: string;
  country: string;
}): string {
  const parts = [
    addr.firstName.toLowerCase().trim(),
    addr.lastName.toLowerCase().trim(),
    addr.address1.toLowerCase().trim(),
    addr.address2?.toLowerCase().trim() ?? "", // Include apt/suite number
    addr.city.toLowerCase().trim(),
    addr.province.toLowerCase().trim(),
    addr.zip.replace(/\s/g, "").toLowerCase(),
    addr.country.toLowerCase().trim(),
  ];

  // Add company if provided (important for business addresses)
  if (addr.company?.trim()) {
    parts.splice(2, 0, addr.company.toLowerCase().trim());
  }

  return parts.join("|");
}

// Helper: find or create shipping address with deduplication
export async function findOrCreateShippingAddress(params: {
  customerId: string;
  firstName: string;
  lastName: string;
  company?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  province: string;
  zip: string;
  country: string;
  phone?: string | null;
}) {
  const { customerId, ...addressData } = params;

  // Normalize for comparison
  const normalized = normalizeAddress({
    firstName: addressData.firstName,
    lastName: addressData.lastName,
    address1: addressData.address1,
    city: addressData.city,
    province: addressData.province,
    zip: addressData.zip,
    country: addressData.country,
    company: addressData.company ?? null,
    address2: addressData.address2 ?? null,
  });

  // Check if this customer already has this exact address
  const existingAddresses = await db.shippingAddress.findMany({
    where: { customerId },
    select: {
      id: true,
      address1: true,
      city: true,
      province: true,
      zip: true,
      country: true,
      isDefault: true,
      firstName: true,
      lastName: true,
      company: true,
      address2: true,
    },
  });

  // Find matching address by normalized comparison
  const matchingAddress = existingAddresses.find((addr) => {
    const existingNormalized = normalizeAddress({
      firstName: addr.firstName,
      lastName: addr.lastName,
      address1: addr.address1,
      city: addr.city,
      province: addr.province ?? "",
      zip: addr.zip,
      country: addr.country,
      company: addr.company ?? null,
      address2: addr.address2 ?? null,
    });
    return existingNormalized === normalized;
  });

  if (matchingAddress) {
    console.log(`[Address] Reusing existing address: ${matchingAddress.id}`);
    return matchingAddress.id;
  }

  // Create new address
  const isFirstAddress = existingAddresses.length === 0;
  const newAddress = await db.shippingAddress.create({
    data: {
      firstName: addressData.firstName,
      lastName: addressData.lastName,
      company: addressData.company ?? null,
      address1: addressData.address1,
      address2: addressData.address2 ?? null,
      city: addressData.city,
      province: addressData.province,
      zip: addressData.zip,
      country: addressData.country,
      phone: addressData.phone ?? null,
      customerId,
      isDefault: isFirstAddress, // First address is default
    },
  });

  console.log(
    `[Address] Created new address: ${newAddress.id} (default: ${isFirstAddress})`,
  );
  return newAddress.id;
}
