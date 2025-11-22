/**
 * Capture Session Endpoint (Optional)
 * 
 * Only needed if supports_manual_capture = true
 * Shopify calls this when merchant manually captures an authorized payment.
 * 
 * Request from Shopify includes:
 * - id: capture session ID
 * - gid: global ID
 * - amount: capture amount
 * - currency: currency code
 * - payment_id: original payment session ID
 * - proposed_at: timestamp
 */

import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  
  try {
    const captureSessionData = await request.json();
    
    const {
      id,
      gid,
      amount,
      currency,
      payment_id,
      proposed_at,
    } = captureSessionData;

    console.log("[Capture Session] Received:", {
      id,
      amount,
      currency,
      payment_id,
    });

    // Store capture session in database
    await db.captureSession.create({
      data: {
        sessionId: id,
        gid,
        paymentSessionId: payment_id,
        amount: parseFloat(amount),
        currency,
        proposedAt: proposed_at,
        status: "pending",
        rawData: JSON.stringify(captureSessionData),
      },
    });

    console.log("[Capture Session] Created successfully");

    return Response.json(
      {
        success: true,
        capture_session_id: id,
      },
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[Capture Session] Error:", error);
    
    return Response.json(
      {
        error: "Failed to create capture session",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};
