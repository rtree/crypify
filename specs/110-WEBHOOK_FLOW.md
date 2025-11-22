# Webhook処理フロー解説（Remix `/api/webhooks/orders_paid` エンドポイント）

このドキュメントでは、Shopify `orders/paid` Webhookを受信するRemixエンドポイントの処理フローを段階的に解説します。

---

## 📌 概要

**エンドポイント**: `https://crypfy-webhook.run.app/api/webhooks/orders_paid` (POST)  
**目的**: Shopifyで注文が確定（決済完了）した時に、自動的にCrypto Walletを作成し、顧客にメールでアクセスリンクを送信する。

**トリガー**: Shopify `orders/paid` Webhook（Shopifyが自動送信）  
**メソッド**: POST  
**認証**: HMAC-SHA256署名（Shopifyが自動付与、`authenticate.webhook()`で検証）

---

## 🔄 処理フロー全体像

```
┌─────────────────────────────────────────────────────────────┐
│  1. 顧客がShopifyで購入 (Bogus Gateway)                     │
│     → Complete Order                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Shopify が orders/paid Webhook を送信                   │
│     POST https://crypfy-webhook.run.app/api/webhooks/orders_paid │
│                                                             │
│     Headers:                                                │
│       X-Shopify-Topic: orders/paid                          │
│       X-Shopify-Hmac-Sha256: xxxxx                          │
│       X-Shopify-Shop-Domain: crypfy-dev.myshopify.com       │
│                                                             │
│     Body (JSON):                                            │
│       {                                                     │
│         "id": 5678901234,                                   │
│         "email": "customer@example.com",                    │
│         "total_price": "100.00",                            │
│         "currency": "USD",                                  │
│         "financial_status": "paid",                         │
│         ...                                                 │
│       }                                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Remix (Cloud Run) がWebhookを受信                       │
│     /app/routes/api.webhooks.orders_paid.tsx                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  4. authenticate.webhook() で自動検証                       │
│     - HMAC署名検証 (Shopify公式ライブラリ)                  │
│     - Shop検証                                              │
│     - Topic検証                                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
                    検証成功 ✅
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  5. Phase別処理分岐                                         │
│                                                             │
│  【Phase 1】 (現在 - 空実装)                                │
│    - ログ出力のみ                                           │
│    - 200 OK返却                                             │
│                                                             │
│  【Phase 2】 (CDP実装)                                      │
│    - CDP Embedded Wallet作成                                │
│    - USDC Reward送金 (10%)                                  │
│    - Order Metafields保存                                   │
│    - メール送信 (Nodemailer)                                │
│                                                             │
│  【Phase 3】 (セキュリティ強化)                             │
│    - 冪等性チェック (Order Tags)                            │
│    - JWT署名トークン生成                                    │
│    - エラー処理・リトライ                                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  6. 顧客がメールを受信 (Phase 2以降)                        │
│     件名: 🎉 Crypto Walletをプレゼント！                    │
│     本文: [Walletを開く] https://wallet.crypfy.dev/start?token=xxx │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  7. 顧客がリンクをクリック                                  │
│     → Next.js Wallet UI が起動                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Phase 1: 空実装（現在の状態）

### ファイル: `/app/routes/api.webhooks.orders_paid.tsx`

```typescript
import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export async function action({ request }: ActionFunctionArgs) {
  // 1. Shopify公式ライブラリで自動検証
  const { topic, shop, payload } = await authenticate.webhook(request);

  console.log("[Webhook] Received:", { topic, shop });

  // 2. Order情報を取得
  const order = payload as {
    id: number;
    email: string;
    total_price: string;
    currency: string;
    financial_status: string;
  };

  console.log("[Webhook] Order:", {
    id: order.id,
    email: order.email,
    total_price: order.total_price,
  });

  // 3. Phase 1: ログのみ、200 OK返却
  return new Response(
    JSON.stringify({ success: true, message: "Webhook received (Phase 1)" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
```

### 動作確認方法

1. **Shopify Admin → Settings → Notifications → Webhooks**
2. **Create webhook**:
   - Event: `Order payment`
   - Format: `JSON`
   - URL: `https://crypfy-webhook.run.app/api/webhooks/orders_paid`
3. **Test order**:
   - Bogus Gateway (カード番号: `1`)
   - Complete Order
4. **Cloud Run Logs確認**:
   ```bash
   gcloud run logs read crypfy-webhook --region us-west1 --limit 50
   ```

### 期待される出力

```
[Webhook] Received: { topic: 'orders/paid', shop: 'crypfy-dev.myshopify.com' }
[Webhook] Order: {
  id: 5678901234,
  email: 'customer@example.com',
  total_price: '100.00'
}
```

---

## 🔥 Phase 2: CDP実装 + メール送信

### 追加処理フロー

```typescript
export async function action({ request }: ActionFunctionArgs) {
  const { topic, shop, payload } = await authenticate.webhook(request);
  const order = payload as Order;

  // 1. 冪等性チェック（重複防止）
  const existingTag = order.tags?.includes("crypfy_rewarded");
  if (existingTag) {
    console.log("[Webhook] Already processed, skipping");
    return new Response(JSON.stringify({ success: true, message: "Already processed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Reward額を計算（購入額の10%）
  const rewardAmount = (parseFloat(order.total_price) * 0.1).toFixed(2);

  // 3. CDP Embedded Wallet作成
  const wallet = await createEmbeddedWallet({
    email: order.email,
    orderId: order.id.toString(),
  });

  console.log("[Webhook] Wallet created:", wallet.address);

  // 4. USDC Reward送金（Base Sepolia）
  const txHash = await sendUSDCReward({
    toAddress: wallet.address,
    amount: rewardAmount,
  });

  console.log("[Webhook] Reward sent:", txHash);

  // 5. Shopify Order Metafieldsに保存
  await saveWalletInfo({
    orderId: order.id,
    walletAddress: wallet.address,
    txHash: txHash,
    rewardAmount: rewardAmount,
  });

  // 6. Order Tagを追加（冪等性フラグ）
  await addOrderTag(order.id, "crypfy_rewarded");

  // 7. JWT署名トークン生成（有効期限: 7日）
  const token = generateJWT({
    orderId: order.id,
    email: order.email,
    walletAddress: wallet.address,
  });

  // 8. メール送信（Nodemailer）
  await sendEmail({
    to: order.email,
    subject: "🎉 Crypto Walletをプレゼント！",
    html: `
      <h1>お買い上げありがとうございます！</h1>
      <p>あなた専用のCrypto Walletを用意しました。</p>
      <p>購入額の10%（${rewardAmount} USDC）をプレゼント🎁</p>
      <a href="https://wallet.crypfy.dev/start?token=${token}">
        👉 Walletを開く
      </a>
    `,
  });

  return new Response(
    JSON.stringify({ success: true, message: "Wallet created and email sent" }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
```

### 必要な環境変数

```env
# Shopify
SHOPIFY_API_KEY=xxxxx
SHOPIFY_API_SECRET=xxxxx

# CDP (Coinbase Developer Platform)
CDP_API_KEY=xxxxx
CDP_API_SECRET=xxxxx

# JWT
JWT_SECRET=xxxxx (openssl rand -base64 32)

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=app-password
```

---

## ✅ Phase 3: セキュリティ強化

### 追加機能

1. **冪等性の徹底**
   - Order Tag: `crypfy_rewarded` でフラグ管理
   - Webhook重複送信対策

2. **JWT署名トークン**
   - 有効期限: 7日
   - ペイロード: `{ orderId, email, walletAddress, exp }`
   - 署名: `HS256`

3. **エラー処理**
   - CDP API失敗 → リトライ（3回）
   - メール送信失敗 → ログ記録、後続処理継続
   - Order Metafields保存失敗 → エラーログ

4. **ロギング強化**
   - 構造化ログ（JSON）
   - トレースID付与
   - エラー詳細記録

### コード例

```typescript
// 冪等性チェック
const isProcessed = await checkIfProcessed(order.id);
if (isProcessed) {
  return new Response(JSON.stringify({ success: true, cached: true }), {
    status: 200,
  });
}

// リトライロジック
const wallet = await retry(
  () => createEmbeddedWallet({ email: order.email }),
  { retries: 3, delay: 1000 }
);

// エラーハンドリング
try {
  await sendEmail({ to: order.email, ... });
} catch (error) {
  console.error("[Webhook] Email failed:", error);
  // 続行（Wallet作成は成功しているため）
}

// JWT検証（Next.js側）
const decoded = jwt.verify(token, JWT_SECRET);
if (decoded.exp < Date.now() / 1000) {
  throw new Error("Token expired");
}
```

---

## 🛠️ デバッグ・トラブルシューティング

### Webhook が届かない場合

1. **Shopify Admin確認**:
   - Settings → Notifications → Webhooks
   - 登録されているか確認
   - URL が正しいか確認

2. **Cloud Run確認**:
   ```bash
   gcloud run services describe crypfy-webhook --region us-west1
   # URL確認: https://crypfy-webhook-xxxxx.run.app
   ```

3. **HMAC検証エラー**:
   ```bash
   # SHOPIFY_API_SECRET が正しくセットされているか確認
   gcloud secrets versions access latest --secret="SHOPIFY_API_SECRET"
   ```

### Webhook受信確認（ローカル開発）

```bash
# Cloudflare Tunnelで公開
cd /home/araki/crypify/frontend-payext
pnpm run dev

# 別ターミナルでログ監視
tail -f /path/to/logs
```

### 手動テスト（curl）

```bash
# Shopify Webhookをシミュレート
curl -X POST https://crypfy-webhook.run.app/api/webhooks/orders_paid \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: orders/paid" \
  -H "X-Shopify-Hmac-Sha256: $(echo -n '{"id":123}' | openssl dgst -sha256 -hmac "$SHOPIFY_API_SECRET" -binary | base64)" \
  -H "X-Shopify-Shop-Domain: crypfy-dev.myshopify.com" \
  -d '{"id":123,"email":"test@example.com","total_price":"100.00","currency":"USD","financial_status":"paid"}'
```

---

## 📊 パフォーマンス・スケーリング

### Cloud Run設定

```yaml
# .github/workflows/deploy-remix-webhook.yml
--min-instances 1        # コールドスタート回避
--max-instances 10       # スケーリング上限
--concurrency 5          # 同時リクエスト数
--memory 512Mi           # メモリ
--cpu 1                  # CPU
--timeout 30s            # タイムアウト
```

### 処理時間目標

| フェーズ | 目標時間 | 内訳 |
|---------|---------|------|
| Phase 1 | < 100ms | ログのみ |
| Phase 2 | < 5s    | CDP Wallet作成 (2s) + USDC送金 (2s) + メール送信 (1s) |
| Phase 3 | < 7s    | + Metafields保存 (1s) + Tag追加 (1s) |

### スケーリング戦略

- **同時注文**: 最大50件/秒まで対応（10 instances × 5 concurrency）
- **CDP APIレート制限**: 100 req/min → キュー実装で対応
- **メール送信制限**: Gmail 500件/日 → SendGrid等に移行

---

## 🔗 関連ドキュメント

- [CDP実装フロー](./CDP_FLOW.md) - Coinbase Developer Platform統合詳細
- [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) - プロジェクト全体構造
- [PROCEDURE.md](./PROCEDURE.md) - CI/CD設定手順

---

**最終更新**: 2025-11-22
