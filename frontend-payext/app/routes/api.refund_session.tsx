/**
 * Refund Session Endpoint
 * 
 * Shopify calls this endpoint when a merchant initiates a refund.
 * This endpoint must return HTTP 201 for successful refund session creation.
 * 
 * Request from Shopify includes:
 * - id: refund session ID
 * - gid: global ID
 * - amount: refund amount
 * - currency: currency code
 * - payment_id: original payment session ID
 * - proposed_at: timestamp
 */

import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  
  try {
    const refundSessionData = await request.json();
    
    const {
      id,
      gid,
      amount,
      currency,
      payment_id,
      proposed_at,
    } = refundSessionData;

    console.log("[Refund Session] Received:", {
      id,
      amount,
      currency,
      payment_id,
    });

    // Store refund session in database
    await db.refundSession.create({
      data: {
        sessionId: id,
        gid,
        paymentSessionId: payment_id,
        amount: parseFloat(amount),
        currency,
        proposedAt: proposed_at,
        status: "pending",
        rawData: JSON.stringify(refundSessionData),
      },
    });

    // For crypto payments, refunds might need to be processed manually
    // or through smart contract interactions
    // This endpoint acknowledges the refund request
    // Actual refund processing would be done asynchronously

    console.log("[Refund Session] Created successfully");

    // Return 201 Created status
    return json(
      {
        success: true,
        refund_session_id: id,
      },
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[Refund Session] Error:", error);
    
    return json(
      {
        error: "Failed to create refund session",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};
