import { describe, expect, it } from "vitest";

import {
  buildCustomerAddressesCsv,
  buildCustomersCsv,
  buildDiscountsCsv,
  buildOrderItemsCsv,
  buildOrdersCsv,
  buildReviewsCsv,
  type CustomerForExport,
  type DiscountForExport,
  type OrderForExport,
  type ReviewForExport,
} from "./csv-builders";

// papaparse quotes every field with { quotes: true }, and separates
// rows with \r\n. These helpers keep the fixtures below readable.
function csvLines(csv: string): string[] {
  return csv.split("\r\n");
}

describe("buildOrdersCsv", () => {
  const baseOrder: OrderForExport = {
    orderNumber: 1001,
    createdAt: new Date(Date.UTC(2026, 0, 5, 9, 30, 0)),
    customerName: "Jane Doe",
    customerEmail: "jane@example.com",
    status: "completed",
    paymentStatus: "paid",
    fulfillmentStatus: "fulfilled",
    deliveryMethod: "ship",
    paymentMethod: "card",
    subtotal: 5000,
    shipping: 500,
    tax: 300,
    discount: 1000,
    total: 4800,
    refundAmountCents: 0,
    discountCode: { code: "SAVE10" },
    items: [
      {
        productName: "Widget",
        variantName: "Blue",
        sku: "WID-BLU",
        price: 2500,
        quantity: 2,
        total: 5000,
        fulfilledQuantity: 2,
      },
    ],
    shippingAddress: {
      firstName: "Jane",
      lastName: "Doe",
      address1: "123 Main St",
      address2: null,
      city: "Springfield",
      province: "MI",
      zip: "48000",
      country: "US",
    },
    stripeSessionId: "cs_test_123",
    stripePaymentIntentId: "pi_test_123",
    customerPhone: "555-1212",
    customerNote: "Please gift wrap",
    internalNote: "VIP customer",
    shipments: [
      { carrier: "UPS", trackingNumber: "1Z999" },
      { carrier: "USPS", trackingNumber: "9400111" },
    ],
  };

  it("emits the exact header row", () => {
    const [header] = csvLines(buildOrdersCsv([baseOrder]));
    expect(header).toBe(
      [
        "Order Number",
        "Date",
        "Customer Name",
        "Customer Email",
        "Status",
        "Payment Status",
        "Fulfillment Status",
        "Delivery Method",
        "Subtotal",
        "Shipping",
        "Tax",
        "Discount",
        "Total",
        "Refund Amount",
        "Discount Code",
        "Item Count",
        "Items",
        "Shipping Address",
        "Payment Method",
        "Stripe Session ID",
        "Stripe Payment Intent ID",
        "Customer Phone",
        "Customer Note",
        "Internal Note",
        "Tracking",
      ]
        .map((h) => `"${h}"`)
        .join(","),
    );
  });

  it("formats cents as dollars, joins items, and formats the address", () => {
    const [, row] = csvLines(buildOrdersCsv([baseOrder]));
    expect(row).toContain('"50.00"'); // subtotal
    expect(row).toContain('"5.00"'); // shipping
    expect(row).toContain('"3.00"'); // tax
    expect(row).toContain('"10.00"'); // discount
    expect(row).toContain('"48.00"'); // total
    expect(row).toContain('"2x Widget (Blue)"');
    expect(row).toContain('"Jane Doe, 123 Main St, Springfield, MI 48000, US"');
  });

  it("joins multiple shipments into the Tracking column with '; '", () => {
    const [, row] = csvLines(buildOrdersCsv([baseOrder]));
    expect(row).toContain('"UPS 1Z999; USPS 9400111"');
  });

  it("handles missing address, discount code, and shipments gracefully", () => {
    const order: OrderForExport = {
      ...baseOrder,
      shippingAddress: null,
      discountCode: null,
      shipments: [],
      customerName: null,
      customerNote: null,
      internalNote: null,
    };
    const [, row] = csvLines(buildOrdersCsv([order]));
    // Shipping Address, Discount Code, Tracking, Customer Name, notes all blank
    expect(row).not.toContain("undefined");
    expect(row).not.toContain("null");
  });

  it("returns an empty string for an empty order list (papaparse behavior)", () => {
    expect(buildOrdersCsv([])).toBe("");
  });
});

describe("buildOrderItemsCsv", () => {
  const order: OrderForExport = {
    orderNumber: 2002,
    createdAt: new Date(Date.UTC(2026, 1, 1, 0, 0, 0)),
    customerEmail: "buyer@example.com",
    status: "completed",
    paymentStatus: "paid",
    fulfillmentStatus: "partially_fulfilled",
    deliveryMethod: "ship",
    paymentMethod: "card",
    subtotal: 1234,
    shipping: 0,
    tax: 0,
    discount: 0,
    total: 1234,
    items: [
      {
        productName: "Gadget",
        variantName: null,
        sku: "GAD-1",
        price: 1234,
        quantity: 1,
        total: 1234,
        fulfilledQuantity: 0,
      },
    ],
  };

  it("emits the exact header row", () => {
    const [header] = csvLines(buildOrderItemsCsv([order]));
    expect(header).toBe(
      [
        "Order Number",
        "Order Date",
        "Product Name",
        "Variant Name",
        "SKU",
        "Unit Price",
        "Quantity",
        "Line Total",
        "Fulfilled Quantity",
      ]
        .map((h) => `"${h}"`)
        .join(","),
    );
  });

  it("converts cents (1234) to dollars ('12.34')", () => {
    const [, row] = csvLines(buildOrderItemsCsv([order]));
    expect(row).toContain('"12.34"');
  });

  it("emits one row per item across multiple orders", () => {
    const secondOrder: OrderForExport = {
      ...order,
      orderNumber: 2003,
      items: [
        {
          productName: "Sprocket",
          variantName: "Large",
          sku: "SPR-L",
          price: 500,
          quantity: 3,
          total: 1500,
          fulfilledQuantity: 3,
        },
      ],
    };
    const lines = csvLines(buildOrderItemsCsv([order, secondOrder]));
    expect(lines).toHaveLength(3); // header + 2 item rows
  });

  it("returns an empty string for an empty order list", () => {
    expect(buildOrderItemsCsv([])).toBe("");
  });
});

describe("buildCustomersCsv", () => {
  const customer: CustomerForExport = {
    email: "jane@example.com",
    firstName: "Jane",
    lastName: "Doe",
    phone: "555-1212",
    acceptsMarketing: true,
    totalSpent: 123456,
    orderCount: 4,
    notes: "Loyal customer",
    createdAt: new Date(Date.UTC(2025, 5, 1, 12, 0, 0)),
  };

  it("emits the exact header row", () => {
    const [header] = csvLines(buildCustomersCsv([customer]));
    expect(header).toBe(
      [
        "Email",
        "First Name",
        "Last Name",
        "Phone",
        "Accepts Marketing",
        "Total Spent",
        "Order Count",
        "Notes",
        "Created At",
      ]
        .map((h) => `"${h}"`)
        .join(","),
    );
  });

  it("formats totalSpent cents as dollars and booleans as Yes/No", () => {
    const [, row] = csvLines(buildCustomersCsv([customer]));
    expect(row).toContain('"1234.56"');
    expect(row).toContain('"Yes"');
  });

  it("formats false booleans as 'No' and nulls as empty strings", () => {
    const noMarketing: CustomerForExport = {
      ...customer,
      acceptsMarketing: false,
      firstName: null,
      lastName: null,
      phone: null,
      notes: null,
    };
    const [, row] = csvLines(buildCustomersCsv([noMarketing]));
    expect(row).toContain('"No"');
    expect(row).not.toContain("null");
  });

  it("returns an empty string for an empty customer list", () => {
    expect(buildCustomersCsv([])).toBe("");
  });
});

describe("buildCustomerAddressesCsv", () => {
  const customers: CustomerForExport[] = [
    {
      email: "jane@example.com",
      firstName: "Jane",
      lastName: "Doe",
      acceptsMarketing: false,
      totalSpent: 0,
      orderCount: 0,
      createdAt: new Date(),
      shippingAddresses: [
        {
          firstName: "Jane",
          lastName: "Doe",
          company: "Acme Co",
          address1: "1 First St",
          address2: "Apt 2",
          city: "Metropolis",
          province: "NY",
          zip: "10001",
          country: "US",
          phone: "555-0000",
          isDefault: true,
        },
        {
          firstName: "Jane",
          lastName: "Doe",
          address1: "2 Second Ave",
          city: "Gotham",
          zip: "10002",
          country: "US",
          isDefault: false,
        },
      ],
    },
  ];

  it("emits the exact header row", () => {
    const [header] = csvLines(buildCustomerAddressesCsv(customers));
    expect(header).toBe(
      [
        "Customer Email",
        "First Name",
        "Last Name",
        "Company",
        "Address 1",
        "Address 2",
        "City",
        "State/Province",
        "Zip",
        "Country",
        "Phone",
        "Is Default",
      ]
        .map((h) => `"${h}"`)
        .join(","),
    );
  });

  it("flattens one row per address, repeating the customer email", () => {
    const lines = csvLines(buildCustomerAddressesCsv(customers));
    expect(lines).toHaveLength(3); // header + 2 address rows
    expect(lines[1]).toContain('"jane@example.com"');
    expect(lines[2]).toContain('"jane@example.com"');
    expect(lines[1]).toContain('"Yes"');
    expect(lines[2]).toContain('"No"');
  });

  it("returns an empty string when no customers have addresses", () => {
    expect(
      buildCustomerAddressesCsv([{ ...customers[0]!, shippingAddresses: [] }]),
    ).toBe("");
  });
});

describe("buildDiscountsCsv", () => {
  it("formats a percentage discount's value with a '%' suffix", () => {
    const discount: DiscountForExport = {
      code: "SAVE20",
      type: "percentage",
      value: 20,
      active: true,
      usageLimit: 100,
      usageCount: 5,
      startsAt: new Date(Date.UTC(2026, 0, 1)),
      expiresAt: new Date(Date.UTC(2026, 11, 31)),
      minPurchase: 5000,
      maxDiscount: 2000,
    };
    const [header, row] = csvLines(buildDiscountsCsv([discount]));
    expect(header).toBe(
      [
        "Code",
        "Type",
        "Value",
        "Active",
        "Usage Limit",
        "Usage Count",
        "Starts At",
        "Expires At",
        "Min Purchase",
        "Max Discount",
      ]
        .map((h) => `"${h}"`)
        .join(","),
    );
    expect(row).toContain('"20%"');
    expect(row).toContain('"50.00"'); // minPurchase cents -> dollars
    expect(row).toContain('"20.00"'); // maxDiscount cents -> dollars
  });

  it("formats a fixed discount's value as dollars and handles nulls", () => {
    const discount: DiscountForExport = {
      code: "TENOFF",
      type: "fixed",
      value: 1000,
      active: false,
      usageLimit: null,
      usageCount: 0,
      startsAt: null,
      expiresAt: null,
      minPurchase: null,
      maxDiscount: null,
    };
    const [, row] = csvLines(buildDiscountsCsv([discount]));
    expect(row).toContain('"10.00"');
    expect(row).toContain('"No"');
    expect(row).not.toContain("null");
  });

  it("returns an empty string for an empty discount list", () => {
    expect(buildDiscountsCsv([])).toBe("");
  });
});

describe("buildReviewsCsv", () => {
  const review: ReviewForExport = {
    productName: "Widget",
    productSku: "WID-1",
    rating: 5,
    title: "Great!",
    comment: "Works perfectly.",
    customerName: "Jane Doe",
    customerEmail: "jane@example.com",
    verifiedPurchase: true,
    isApproved: true,
    isHidden: false,
    source: "customer",
    reviewDate: new Date(Date.UTC(2026, 2, 3, 8, 0, 0)),
  };

  it("emits the exact header row", () => {
    const [header] = csvLines(buildReviewsCsv([review]));
    expect(header).toBe(
      [
        "Product Name",
        "Product SKU",
        "Rating",
        "Title",
        "Comment",
        "Customer Name",
        "Customer Email",
        "Verified Purchase",
        "Approved",
        "Hidden",
        "Source",
        "Review Date",
      ]
        .map((h) => `"${h}"`)
        .join(","),
    );
  });

  it("formats booleans as Yes/No", () => {
    const [, row] = csvLines(buildReviewsCsv([review]));
    expect(row).toContain('"Yes"');
    expect(row).toContain('"No"');
  });

  it("returns an empty string for an empty review list", () => {
    expect(buildReviewsCsv([])).toBe("");
  });
});
