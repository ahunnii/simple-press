import { db } from "~/server/db";

/**
 * Links a customer account to a user account when they share the same email.
 * This should be called after user sign-in or registration.
 */
export async function linkCustomerToUser(params: {
  userId: string;
  email: string;
  businessId: string;
}) {
  const { userId, email, businessId } = params;

  try {
    // Find customer with matching email in this business
    const customer = await db.customer.findUnique({
      where: {
        businessId_email: {
          email: email.toLowerCase(),
          businessId,
        },
      },
    });

    if (!customer) {
      console.log(
        `[Customer Link] No customer found for ${email} in business ${businessId}`,
      );
      return null;
    }

    // If customer is already linked to this user, no action needed
    if (customer.userId === userId) {
      console.log(
        `[Customer Link] Customer ${customer.id} already linked to user ${userId}`,
      );
      return customer;
    }

    // If customer is linked to a different user, log warning but don't override
    if (customer.userId && customer.userId !== userId) {
      console.warn(
        `[Customer Link] Customer ${customer.id} is already linked to different user ${customer.userId}`,
      );
      return null;
    }

    // Link customer to user
    const updatedCustomer = await db.customer.update({
      where: { id: customer.id },
      data: { userId },
    });

    console.log(
      `[Customer Link] Successfully linked customer ${customer.id} to user ${userId}`,
    );

    return updatedCustomer;
  } catch (error) {
    console.error("[Customer Link] Error linking customer to user:", error);
    return null;
  }
}
