import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

/**
 * Shopify orders/paid Webhook Handler
 * Phase 1: 空実装 - 200返すだけ（HMAC検証は自動）
 * Phase 2: CDP Wallet作成 + メール送信実装
 */
export async function action({ request }: ActionFunctionArgs) {
  // Shopify authenticate.webhook() が自動でHMAC検証
  try {
    const { topic, shop, payload } = await authenticate.webhook(request);

    console.log("[Webhook] Received:", {
      topic,
      shop,
      timestamp: new Date().toISOString(),
    });

    // Phase 1: ペイロードをログ出力のみ
    const order = payload as {
      id: number;
      email: string;
      total_price: string;
      currency: string;
      financial_status: string;
    };

    console.log("[Webhook] Order received:", {
      id: order.id,
      email: order.email,
      total_price: order.total_price,
      currency: order.currency,
      financial_status: order.financial_status,
    });

    // Phase 2で実装予定:
    // 1. CDP Wallet作成
    // 2. Order Metafieldsにウォレット情報保存
    // 3. メール送信（Nodemailer）

    // Phase 1: 200 OK返すだけ
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Webhook received (Phase 1 - stub implementation)" 
      }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("[Webhook] Error:", error);
    
    // Shopify SDK throws Response objects for authentication failures
    if (error instanceof Response) {
      const errorText = await error.text();
      console.error("[Webhook] Authentication failed:", {
        status: error.status,
        statusText: error.statusText,
        body: errorText,
      });
      
      // Return the error response from Shopify SDK
      return error;
    }
    
    console.error("[Webhook] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return new Response(
      JSON.stringify({ 
        error: "Webhook processing failed",
        message: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}

// GETリクエストは拒否
export async function loader() {
  return new Response(
    JSON.stringify({ error: "Method not allowed" }),
    { 
      status: 405,
      headers: { "Content-Type": "application/json" }
    }
  );
}
