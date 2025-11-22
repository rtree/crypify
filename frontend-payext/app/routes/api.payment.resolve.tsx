/**
 * Payment Resolve API (Admin API Version - No Payment Extension Required)
 * 
 * Called from the payment page after successful crypto transaction.
 * This endpoint:
 * 1. Updates payment session with transaction details
 * 2. Creates a draft order via Shopify Admin API
 * 3. Completes the draft order to create a real order
 * 4. Returns success status and order URL to frontend
 */

import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

interface ResolvePaymentRequest {
  checkoutToken: string;
  txHash: string;
  walletAddress?: string;
  amount: string;
  currency: string;
  lineItems?: Array<{
    variantId: string;
    quantity: number;
  }>;
  customer?: {
    email?: string;
    firstName?: string;
    lastName?: string;
  };
}

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const {
      checkoutToken,
      txHash,
      walletAddress,
      amount,
      currency,
      lineItems,
      customer,
    }: ResolvePaymentRequest = await request.json();

    if (!checkoutToken || !txHash) {
      return Response.json(
        { error: "Checkout token and transaction hash are required" },
        { status: 400 }
      );
    }

    console.log("[Payment Resolve - Admin API] Processing:", {
      checkoutToken,
      txHash,
      walletAddress,
      amount,
      currency,
    });

    // Get Shopify admin session for GraphQL API call
    const { admin, session } = await authenticate.admin(request);

    // Create draft order with crypto payment details
    const draftOrderMutation = `
      mutation draftOrderCreate($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            id
            name
            totalPrice
            createdAt
            order {
              id
              name
              displayFinancialStatus
              displayFulfillmentStatus
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const draftOrderResponse = await admin.graphql(draftOrderMutation, {
      variables: {
        input: {
          email: customer?.email || "crypto-payment@crypify.app",
          note: `Crypto Payment - USDC on Base\nTransaction Hash: ${txHash}\nWallet: ${walletAddress || 'Unknown'}`,
          customAttributes: [
            { key: "payment_method", value: "USDC on Base" },
            { key: "tx_hash", value: txHash },
            { key: "wallet_address", value: walletAddress || "" },
            { key: "blockchain", value: "Base (Chain ID: 8453)" },
          ],
          lineItems: lineItems?.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })) || [],
          shippingAddress: {
            firstName: customer?.firstName || "Crypto",
            lastName: customer?.lastName || "Customer",
          },
        },
      },
    });

    const draftOrderResult = await draftOrderResponse.json();

    if (
      draftOrderResult.data?.draftOrderCreate?.userErrors?.length > 0
    ) {
      const errors = draftOrderResult.data.draftOrderCreate.userErrors;
      console.error("[Payment Resolve] Draft order creation failed:", errors);

      return Response.json(
        {
          error: "Failed to create draft order",
          details: errors,
        },
        { status: 500 }
      );
    }

    const draftOrder = draftOrderResult.data?.draftOrderCreate?.draftOrder;
    
    if (!draftOrder) {
      return Response.json(
        { error: "Draft order creation returned no data" },
        { status: 500 }
      );
    }

    console.log("[Payment Resolve] Draft order created:", {
      id: draftOrder.id,
      name: draftOrder.name,
    });

    // Complete the draft order to create an actual order
    const completeMutation = `
      mutation draftOrderComplete($id: ID!) {
        draftOrderComplete(id: $id) {
          draftOrder {
            id
            order {
              id
              name
              displayFinancialStatus
              displayFulfillmentStatus
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const completeResponse = await admin.graphql(completeMutation, {
      variables: {
        id: draftOrder.id,
      },
    });

    const completeResult = await completeResponse.json();

    if (completeResult.data?.draftOrderComplete?.userErrors?.length > 0) {
      const errors = completeResult.data.draftOrderComplete.userErrors;
      console.error("[Payment Resolve] Order completion failed:", errors);

      return Response.json(
        {
          error: "Failed to complete order",
          details: errors,
        },
        { status: 500 }
      );
    }

    const order = completeResult.data?.draftOrderComplete?.draftOrder?.order;

    // Store transaction in database
    await db.paymentSession.create({
      data: {
        sessionId: checkoutToken,
        gid: order?.id || draftOrder.id,
        amount: parseFloat(amount),
        currency: currency,
        status: "completed",
        transactionHash: txHash,
        walletAddress: walletAddress,
        test: false,
        kind: "sale",
        proposedAt: new Date(),
        shop: session.shop,
      },
    });

    console.log("[Payment Resolve] Order completed:", {
      orderId: order?.id,
      orderName: order?.name,
      txHash,
    });

    // Construct order URL for redirect
    const orderUrl = order
      ? `https://${session.shop}/admin/orders/${order.id.split('/').pop()}`
      : `https://${session.shop}/admin/draft_orders`;

    return Response.json({
      success: true,
      checkoutToken,
      txHash,
      order: {
        id: order?.id || draftOrder.id,
        name: order?.name || draftOrder.name,
        url: orderUrl,
      },
      redirectUrl: orderUrl,
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
