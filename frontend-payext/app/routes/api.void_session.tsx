/**
 * Void Session Endpoint (Optional)
 * 
 * Shopify calls this when merchant voids an authorized payment.
 * 
 * Request from Shopify includes:
 * - id: void session ID
 * - gid: global ID
 * - payment_id: original payment session ID
 * - proposed_at: timestamp
 */

import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);
  
  try {
    const voidSessionData = await request.json();
    
    const {
      id,
      gid,
      payment_id,
      proposed_at,
    } = voidSessionData;

    console.log("[Void Session] Received:", {
      id,
      payment_id,
    });

    // Store void session in database
    await db.voidSession.create({
      data: {
        sessionId: id,
        gid,
        paymentSessionId: payment_id,
        proposedAt: proposed_at,
        status: "pending",
        rawData: JSON.stringify(voidSessionData),
      },
    });

    console.log("[Void Session] Created successfully");

    return json(
      {
        success: true,
        void_session_id: id,
      },
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[Void Session] Error:", error);
    
    return json(
      {
        error: "Failed to create void session",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};
