/**
 * Confirmation Callback Endpoint
 * 
 * Shopify calls this endpoint after paymentSessionConfirm mutation is called.
 * This is used with supports_oversell_protection = true to verify inventory availability.
 * 
 * Request from Shopify includes:
 * - id: payment session ID
 * - gid: global ID
 * - confirmation_result: boolean indicating if payment can proceed
 * - proposed_at: timestamp
 */

import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  
  try {
    const confirmationData = await request.json();
    
    const {
      id,
      gid,
      confirmation_result,
      proposed_at,
    } = confirmationData;

    console.log("[Confirmation Callback] Received:", {
      id,
      confirmation_result,
    });

    // Update payment session with confirmation result
    await db.paymentSession.update({
      where: { sessionId: id },
      data: {
        confirmationResult: confirmation_result,
        confirmationReceivedAt: new Date(),
      },
    });

    if (confirmation_result) {
      console.log("[Confirmation Callback] Payment confirmed - proceeding");
      // Payment can proceed - inventory is available
      // Continue with payment processing
    } else {
      console.log("[Confirmation Callback] Payment rejected - inventory unavailable");
      // Payment cannot proceed - inventory issues or validation failed
      // Should call paymentSessionReject mutation with CONFIRMATION_REJECTED reason
    }

    // Return 2xx status to acknowledge receipt
    return Response.json(
      {
        success: true,
        confirmation_result,
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[Confirmation Callback] Error:", error);
    
    return Response.json(
      {
        error: "Failed to process confirmation callback",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};
