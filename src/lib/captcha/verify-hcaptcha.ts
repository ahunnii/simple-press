"use server";

import { env } from "~/env";

export async function verifyHCaptcha(token: string): Promise<boolean> {
  const secretKey = env.HCAPTCHA_SECRET_KEY;

  if (!secretKey || process.env.NODE_ENV === "development") {
    console.warn("HCAPTCHA_SECRET_KEY not configured - skipping verification");
    return true; // Allow in development
  }

  try {
    const response = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data = (await response.json()) as { success: boolean };
    return data.success === true;
  } catch (error) {
    console.error("hCaptcha verification error:", error);
    return false;
  }
}
