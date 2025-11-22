/**
 * Payment Resolve API
 * 
 * Called from the payment page after successful crypto transaction.
 * This endpoint:
 * 1. Updates payment session with transaction details
 * 2. Calls Shopify paymentSessionResolve mutation
 * 3. Returns success status to frontend
 */

import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { PAYMENT_SESSION_RESOLVE } from "../graphql/payments-apps.mutations";

interface ResolvePaymentRequest {
  paymentId: string;
  txHash: string;
  walletAddress?: string;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { paymentId, txHash, walletAddress }: ResolvePaymentRequest =
      await request.json();

    if (!paymentId || !txHash) {
      return Response.json(
        { error: "Payment ID and transaction hash are required" },
        { status: 400 }
      );
    }

    console.log("[Payment Resolve] Processing:", {
      paymentId,
      txHash,
      walletAddress,
    });

    // Update payment session in database
    const paymentSession = await db.paymentSession.update({
      where: { sessionId: paymentId },
      data: {
        status: "completed",
        transactionHash: txHash,
        walletAddress: walletAddress,
        updatedAt: new Date(),
      },
    });

    // Get Shopify admin session for GraphQL API call
    const { admin } = await authenticate.admin(request);

    // Call Shopify Payments Apps API to resolve the payment session
    const response = await admin.graphql(PAYMENT_SESSION_RESOLVE, {
      variables: {
        id: paymentSession.gid, // Use the global ID from Shopify
      },
    });

    const result = await response.json();

    if (result.data?.paymentSessionResolve?.userErrors?.length > 0) {
      const errors = result.data.paymentSessionResolve.userErrors;
      console.error("[Payment Resolve] Shopify API errors:", errors);

      return Response.json(
        {
          error: "Failed to resolve payment with Shopify",
          details: errors,
        },
        { status: 500 }
      );
    }

    const resolvedSession = result.data?.paymentSessionResolve?.paymentSession;

    console.log("[Payment Resolve] Success:", {
      paymentId,
      txHash,
      state: resolvedSession?.state,
      nextAction: resolvedSession?.nextAction,
    });

    // Check for next action (usually redirect back to Shopify)
    const redirectUrl =
      resolvedSession?.nextAction?.context?.redirectUrl ||
      paymentSession.cancelUrl;

    return Response.json({
      success: true,
      paymentId,
      txHash,
      redirectUrl,
      state: resolvedSession?.state,
    });
  } catch (error) {
    console.error("[Payment Resolve] Error:", error);

    return Response.json(
      {
        error: "Failed to resolve payment",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
};
