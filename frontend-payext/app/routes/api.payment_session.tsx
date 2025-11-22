/**
 * Payment Session Endpoint
 * 
 * Shopify calls this endpoint when a customer selects Crypify as payment method.
 * This endpoint must return a redirect_url within 2xx response.
 * 
 * Request from Shopify includes:
 * - id: payment session ID
 * - gid: global ID
 * - amount: payment amount
 * - currency: currency code
 * - test: boolean indicating test mode
 * - customer: customer information
 * - payment_method: payment method details
 */

import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  // Shopify sends POST request with payment session data
  const { session } = await authenticate.public.appProxy(request);
  
  try {
    const paymentSessionData = await request.json();
    
    // Extract payment session details
    const {
      id,
      gid,
      group,
      amount,
      currency,
      test,
      kind,
      customer,
      payment_method,
      proposed_at,
      cancel_url,
    } = paymentSessionData;

    console.log("[Payment Session] Received:", {
      id,
      amount,
      currency,
      test,
      customer: customer?.email,
    });

    // Store payment session in database for later processing
    await db.paymentSession.create({
      data: {
        sessionId: id,
        gid,
        amount: parseFloat(amount),
        currency,
        test,
        kind,
        customerEmail: customer?.email,
        customerLocale: customer?.locale,
        proposedAt: proposed_at,
        cancelUrl: cancel_url,
        status: "pending",
        paymentMethod: JSON.stringify(payment_method),
        rawData: JSON.stringify(paymentSessionData),
      },
    });

    // Build redirect URL to our payment page
    // This will be a page with OnchainKit integration for crypto payment
    const baseUrl = process.env.SHOPIFY_APP_URL || request.headers.get("origin");
    const redirectUrl = `${baseUrl}/app/pay/${id}`;

    console.log("[Payment Session] Redirecting to:", redirectUrl);

    // Return redirect URL to Shopify (required for successful payment session creation)
    return Response.json(
      {
        redirect_url: redirectUrl,
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[Payment Session] Error:", error);
    
    // Return error status code (not 2xx) to indicate failure
    return Response.json(
      {
        error: "Failed to create payment session",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};
