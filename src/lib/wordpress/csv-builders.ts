import Papa from "papaparse";

// ============================================
// Shared helpers
// ============================================

/** Money is always passed to these builders in cents (Int/Float, matching Prisma). */
const centsToDollars = (cents: number) => (cents / 100).toFixed(2);

const yesNo = (value: boolean) => (value ? "Yes" : "No");

const orEmpty = (value: string | null | undefined) => value ?? "";

/** Matches the date format used elsewhere in the app's CSV exports (full ISO string). */
const formatDate = (date: Date | null | undefined) =>
  date ? date.toISOString() : "";

// ============================================
// Orders
// ============================================

export interface OrderItemForExport {
  productName: string;
  variantName?: string | null;
  sku?: string | null;
  /** Cents. */
  price: number;
  quantity: number;
  /** Cents. */
  total: number;
  fulfilledQuantity?: number;
}

export interface OrderShipmentForExport {
  carrier?: string | null;
  trackingNumber?: string | null;
}

export interface OrderAddressForExport {
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string | null;
  city: string;
  province?: string | null;
  zip: string;
  country: string;
}

export interface OrderForExport {
  orderNumber: number;
  createdAt: Date;
  customerName?: string | null;
  customerEmail: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  deliveryMethod: string;
  paymentMethod: string;
  /** Cents. */
  subtotal: number;
  /** Cents. */
  shipping: number;
  /** Cents. */
  tax: number;
  /** Cents. */
  discount: number;
  /** Cents. */
  total: number;
  /** Cents. */
  refundAmountCents?: number | null;
  discountCode?: { code: string } | null;
  items: OrderItemForExport[];
  shippingAddress?: OrderAddressForExport | null;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  customerPhone?: string | null;
  customerNote?: string | null;
  internalNote?: string | null;
  shipments?: OrderShipmentForExport[];
}

function formatShippingAddress(
  addr: OrderAddressForExport | null | undefined,
): string {
  if (!addr) return "";
  return [
    `${addr.firstName} ${addr.lastName}`.trim(),
    addr.address1,
    addr.address2,
    addr.city,
    [addr.province, addr.zip].filter(Boolean).join(" "),
    addr.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatTracking(shipments: OrderShipmentForExport[] | undefined) {
  if (!shipments || shipments.length === 0) return "";
  return shipments
    .map((s) => `${s.carrier ?? ""} ${s.trackingNumber ?? ""}`.trim())
    .filter(Boolean)
    .join("; ");
}

export function buildOrdersCsv(orders: OrderForExport[]): string {
  const rows = orders.map((order) => ({
    "Order Number": order.orderNumber,
    Date: formatDate(order.createdAt),
    "Customer Name": orEmpty(order.customerName),
    "Customer Email": order.customerEmail,
    Status: order.status,
    "Payment Status": order.paymentStatus,
    "Fulfillment Status": order.fulfillmentStatus,
    "Delivery Method": order.deliveryMethod,
    Subtotal: centsToDollars(order.subtotal),
    Shipping: centsToDollars(order.shipping),
    Tax: centsToDollars(order.tax),
    Discount: centsToDollars(order.discount),
    Total: centsToDollars(order.total),
    "Refund Amount": centsToDollars(order.refundAmountCents ?? 0),
    "Discount Code": orEmpty(order.discountCode?.code),
    "Item Count": order.items.reduce((sum, i) => sum + i.quantity, 0),
    Items: order.items
      .map(
        (i) =>
          `${i.quantity}x ${i.productName}${i.variantName ? ` (${i.variantName})` : ""}`,
      )
      .join("; "),
    "Shipping Address": formatShippingAddress(order.shippingAddress),
    "Payment Method": order.paymentMethod,
    "Stripe Session ID": orEmpty(order.stripeSessionId),
    "Stripe Payment Intent ID": orEmpty(order.stripePaymentIntentId),
    "Customer Phone": orEmpty(order.customerPhone),
    "Customer Note": orEmpty(order.customerNote),
    "Internal Note": orEmpty(order.internalNote),
    Tracking: formatTracking(order.shipments),
  }));

  return Papa.unparse(rows, { quotes: true, header: true });
}

export function buildOrderItemsCsv(orders: OrderForExport[]): string {
  const rows = orders.flatMap((order) =>
    order.items.map((item) => ({
      "Order Number": order.orderNumber,
      "Order Date": formatDate(order.createdAt),
      "Product Name": item.productName,
      "Variant Name": orEmpty(item.variantName),
      SKU: orEmpty(item.sku),
      "Unit Price": centsToDollars(item.price),
      Quantity: item.quantity,
      "Line Total": centsToDollars(item.total),
      "Fulfilled Quantity": item.fulfilledQuantity ?? 0,
    })),
  );

  return Papa.unparse(rows, { quotes: true, header: true });
}

// ============================================
// Customers
// ============================================

export interface CustomerAddressForExport {
  firstName: string;
  lastName: string;
  company?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  province?: string | null;
  zip: string;
  country: string;
  phone?: string | null;
  isDefault: boolean;
}

export interface CustomerForExport {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  acceptsMarketing: boolean;
  /** Cents. */
  totalSpent: number;
  orderCount: number;
  notes?: string | null;
  createdAt: Date;
  shippingAddresses?: CustomerAddressForExport[];
}

export function buildCustomersCsv(customers: CustomerForExport[]): string {
  const rows = customers.map((c) => ({
    Email: c.email,
    "First Name": orEmpty(c.firstName),
    "Last Name": orEmpty(c.lastName),
    Phone: orEmpty(c.phone),
    "Accepts Marketing": yesNo(c.acceptsMarketing),
    "Total Spent": centsToDollars(c.totalSpent),
    "Order Count": c.orderCount,
    Notes: orEmpty(c.notes),
    "Created At": formatDate(c.createdAt),
  }));

  return Papa.unparse(rows, { quotes: true, header: true });
}

export function buildCustomerAddressesCsv(
  customers: CustomerForExport[],
): string {
  const rows = customers.flatMap((c) =>
    (c.shippingAddresses ?? []).map((addr) => ({
      "Customer Email": c.email,
      "First Name": addr.firstName,
      "Last Name": addr.lastName,
      Company: orEmpty(addr.company),
      "Address 1": addr.address1,
      "Address 2": orEmpty(addr.address2),
      City: addr.city,
      "State/Province": orEmpty(addr.province),
      Zip: addr.zip,
      Country: addr.country,
      Phone: orEmpty(addr.phone),
      "Is Default": yesNo(addr.isDefault),
    })),
  );

  return Papa.unparse(rows, { quotes: true, header: true });
}

// ============================================
// Discounts
// ============================================

export interface DiscountForExport {
  code: string;
  /** "percentage" | "fixed" */
  type: string;
  /** For "percentage": whole number percent (e.g. 20). For "fixed": cents. */
  value: number;
  active: boolean;
  usageLimit?: number | null;
  usageCount: number;
  startsAt?: Date | null;
  expiresAt?: Date | null;
  /** Cents. */
  minPurchase?: number | null;
  /** Cents. */
  maxDiscount?: number | null;
}

function formatDiscountValue(discount: DiscountForExport) {
  return discount.type === "percentage"
    ? `${discount.value}%`
    : centsToDollars(discount.value);
}

export function buildDiscountsCsv(discounts: DiscountForExport[]): string {
  const rows = discounts.map((d) => ({
    Code: d.code,
    Type: d.type,
    Value: formatDiscountValue(d),
    Active: yesNo(d.active),
    "Usage Limit": d.usageLimit ?? "",
    "Usage Count": d.usageCount,
    "Starts At": formatDate(d.startsAt),
    "Expires At": formatDate(d.expiresAt),
    "Min Purchase": d.minPurchase != null ? centsToDollars(d.minPurchase) : "",
    "Max Discount": d.maxDiscount != null ? centsToDollars(d.maxDiscount) : "",
  }));

  return Papa.unparse(rows, { quotes: true, header: true });
}

// ============================================
// Reviews
// ============================================

export interface ReviewForExport {
  productName: string;
  productSku?: string | null;
  rating: number;
  title?: string | null;
  comment: string;
  customerName: string;
  customerEmail?: string | null;
  verifiedPurchase: boolean;
  isApproved: boolean;
  isHidden: boolean;
  source: string;
  reviewDate: Date;
}

export function buildReviewsCsv(reviews: ReviewForExport[]): string {
  const rows = reviews.map((r) => ({
    "Product Name": r.productName,
    "Product SKU": orEmpty(r.productSku),
    Rating: r.rating,
    Title: orEmpty(r.title),
    Comment: r.comment,
    "Customer Name": r.customerName,
    "Customer Email": orEmpty(r.customerEmail),
    "Verified Purchase": yesNo(r.verifiedPurchase),
    Approved: yesNo(r.isApproved),
    Hidden: yesNo(r.isHidden),
    Source: r.source,
    "Review Date": formatDate(r.reviewDate),
  }));

  return Papa.unparse(rows, { quotes: true, header: true });
}
