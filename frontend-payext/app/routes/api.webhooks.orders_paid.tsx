import { ActionFunctionArgs, json } from "@remix-run/node";
import crypto from "crypto";

/**
 * Shopify orders/paid Webhook Handler
 * Phase 1: 空実装 - 200返すだけ（HMAC検証は形だけ）
 * Phase 2: CDP Wallet作成 + メール送信実装
 */
export async function action({ request }: ActionFunctionArgs) {
  // HMAC検証（形だけ - Phase 1では詳細チェックなし）
  const hmac = request.headers.get("X-Shopify-Hmac-Sha256");
  const topic = request.headers.get("X-Shopify-Topic");
  const shop = request.headers.get("X-Shopify-Shop-Domain");

  console.log("[Webhook] Received:", {
    topic,
    shop,
    hmac: hmac ? "present" : "missing",
    timestamp: new Date().toISOString(),
  });

  // リクエストボディを取得
  const rawBody = await request.text();
  
  // Phase 1: 簡易HMAC検証（形だけ）
  if (!hmac) {
    console.warn("[Webhook] Missing HMAC header");
    return json({ error: "Missing HMAC" }, { status: 401 });
  }

  // Phase 2で実装予定: 厳密なHMAC検証
  // const apiSecret = process.env.SHOPIFY_API_SECRET;
  // const calculatedHmac = crypto
  //   .createHmac("sha256", apiSecret)
  //   .update(rawBody)
  //   .digest("base64");
  // if (hmac !== calculatedHmac) {
  //   return json({ error: "Invalid HMAC" }, { status: 401 });
  // }

  // Phase 1: ペイロードをパース（ログ出力のみ）
  try {
    const order = JSON.parse(rawBody);
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
    return json(
      { 
        success: true, 
        message: "Webhook received (Phase 1 - stub implementation)" 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Webhook] Parse error:", error);
    return json({ error: "Invalid JSON" }, { status: 400 });
  }
}

// GETリクエストは拒否
export async function loader() {
  return json({ error: "Method not allowed" }, { status: 405 });
}
