# crypify - プロジェクト全体構造ドキュメント

**作成日**: 2025-11-21  
**最終更新**: 2025-11-22  
**Dev Store**: crypfy-dev.myshopify.com (Development Store - Plus相当)  
**プロジェクト種別**: Shopify Webhook + CDP Embedded Wallets (Remix一本化、**DB無し**)

**ハッカソン戦略（最小構成）**: 
- 🎯 **Hackathon Goal**: Bogus決済 → Webhook → CDP Wallet自動発行 → USDC Reward → メール → Passkey認証
- 🔥 **Early Deploy**: Cloudflare Tunnel → Cloud Run移行（ハッカソン中に本番URL化）
- 🚀 **Post-Hackathon**: Base Mainnet移行、Offsite Payment Extension（Partner承認後）

---

## 📌 プロジェクト概要

### 目的
**Shopifyで購入すると自動でCrypto Walletがもらえる、Web2→Web3オンボーディング体験**を提供。  
購入額の10%をUSDC Rewardsとして還元し、次回購入や他のWeb3サービスで利用可能にする。

### 解決する課題
| 課題 | 従来の問題 | crypify の解決策 |
|------|-----------|----------------|
| **Cryptoへの参入障壁** | ウォレット作成・秘密鍵管理が必要 | 購入だけで自動Wallet配布（Passkey認証） |
| **Web3ロイヤルティの欠如** | ポイント＝中央集権的、他で使えない | USDC Rewards＝他サービス/DEXで自由に利用可能 |
| **マーチャント側の複雑性** | Crypto決済統合が技術的に困難 | Shopify Webhookだけで完結 |
| **高ガス代** | Ethereum Mainnet → $5-50 | Base L2 → $0.001-0.01（マイクロリワード可能） |

---

## 🏗️ システムアーキテクチャ

### ハッカソン版フロー（Bogus決済 + Wallet自動発行）

```
┌─────────────────────────────────────────────────────────────┐
│              Shopify Checkout (Standard UI)                 │
│                                                             │
│  支払い方法:                                                │
│  ● Bogus Gateway (テスト決済)                              │
│                                                             │
│  カード番号: 1 (成功) / 2 (失敗) を入力                     │
│  [ Complete Order ] ボタンをクリック                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
                   (注文完了 Webhook)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│         Shopify Order Created Webhook                       │
│         → crypify Backend (Remix App)                       │
│                                                             │
│  1. 顧客情報取得 (email, 購入額)                            │
│  2. CDP Embedded Wallet 作成                                │
│     - Passkey認証設定                                       │
│     - ウォレットアドレス生成                                │
│  3. 購入額の10%をUSDCでエアドロップ                         │
│     - Base Sepoliaで実行 (テスト)                           │
│  4. メール送信 (Shopify Email or SendGrid)                  │
│     - 件名: "🎉 Crypto Walletをプレゼント！"                │
│     - 本文: Walletアクセスリンク                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
                  (顧客がメールを開く)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│         Wallet Access Page (/wallet?token=xxx)              │
│                                                             │
│  1. 署名付きトークン検証（JWT/HMAC, 有効期限付き）           │
│  2. Passkey認証 (Face ID / Touch ID)                        │
│  3. Embedded Wallet表示 (OnchainKit)                        │
│     - USDC残高表示                                          │
│     - トランザクション履歴                                  │
│  4. (将来) 次回購入時に使うボタン                           │
└─────────────────────────────────────────────────────────────┘
```

### コンポーネント構成（ハッカソン最小版）

#### 1. Order Created Webhook Handler (Remix Action) 🔥
- **役割**: Shopify購入完了時にCDP Wallet自動発行
- **処理フロー**:
  1. **HMAC署名検証**（Shopify公式ヘッダー `X-Shopify-Hmac-Sha256`）
  2. **Idempotency確認**（Order Tagsで `crypify_rewarded` チェック）
  3. **CDP Embedded Wallet作成**（@coinbase/coinbase-sdk）
  4. **USDC Reward送金**（購入額10%、Base Sepolia）
  5. **Order Metafields保存**（wallet_address, tx_hash, reward_amount）
  6. **Order Tagに `crypify_rewarded` 追加**（冪等性確保）
  7. **署名付きワンタイムトークン生成**（JWT）
  8. **メール送信**（Shopify Email API）
- **技術**: Remix + @coinbase/coinbase-sdk + Shopify Admin REST API

#### 2. Wallet Access Page (Remix Route)
- **役割**: ユーザーがPasskeyでWalletにアクセス
- **URL**: `/wallet?token=xxx` (JWT署名付き)
- **機能**:
  - トークン検証（有効期限、改ざんチェック）
  - Passkey認証（@base-org/account）
  - USDC残高表示（OnchainKit）
  - トランザクション履歴（Base Sepolia Explorer）
- **技術**: Remix + OnchainKit + @base-org/account

#### 3. Shopify Order Metafields (DB代わり) ✅
- **役割**: Wallet情報の永続化（**外部DB不要**）
- **保存データ**:
  - Tag: `crypify_rewarded` (冪等性フラグ)
  - Metafield: `crypify.wallet_address` (Text)
  - Metafield: `crypify.reward_tx_hash` (Text)
  - Metafield: `crypify.reward_amount` (Decimal)
- **利点**:
  - Cloud Runデプロイが超簡単（DATABASE_URL不要）
  - 再起動・スケールで状態が消えない
  - ハッカソンの試行錯誤スピード最大化

#### 4. CDP Embedded Wallets (Coinbase Infrastructure)
- **役割**: ユーザーWallet管理（秘密鍵はCoinbase側で管理）
- **認証**: Passkey（Face ID / Touch ID）
- **Chain**: Base Sepolia (テスト) → Base Mainnet (本番)

#### 5. GCP Cloud Run (Hosting - ハッカソン中に早期移行) 🔥
- **戦略**: Cloudflare Tunnel → **早期にCloud Run移行**
- **理由**: デモ詰みリスク回避、本番URLで安定稼働
- **設定**: `min-instances=1` でコールドスタート回避、`concurrency=1-5` で安全性確保

---

## 🛠️ 技術スタック詳細

### ✅ 完全準拠バージョン (2025-11-21 検証済み)

| パッケージ | バージョン | 用途 | 備考 |
|----------|----------|------|------|
| `@shopify/app` | 3.58.2 | Shopify App基盤 | Remix統合 |
| `@shopify/cli` | 3.87.4+ | CLI | v3.59.0以降統合 |
| `@coinbase/coinbase-sdk` | 0.25.0 | Server Wallets v2 | ❌ v1 (cdp-sdk) は非推奨 |
| `@base-org/account` | 2.5.0 | Embedded Wallets | Passkey認証 |
| `@coinbase/onchainkit` | 1.1.2 | UI/Onramp | React Components |
| `@coinbase/x402` | 0.7.1 | AI Agent決済 | 将来拡張用 |
| `wagmi` | 2.19.5 | Web3 Hooks | viem統合 |
| `viem` | 2.23.5 | EVM通信 | CDP v2互換 |
| `jsonwebtoken` | latest | JWT署名 | ワンタイムトークン生成 |
| `react` | 18.3.1 | UI Library | OnchainKit依存 |
| `typescript` | 5.7.3 | Type Safety | strictモード |

### ⚠️ 禁止パッケージ
- ❌ `@coinbase/cdp-sdk` (v1 - deprecated)
- ❌ `ethers` (v5系 - wagmi/viemで代替)

---

## 📋 実装ステップ（ハッカソン最小構成）

### Phase 1: 基盤構築 ✅
1. ✅ Shopify App作成 (`pnpm create @shopify/app@latest`)
2. ✅ 開発環境セットアップ（Cloudflare Tunnel起動）
3. ✅ Dev Store準備（crypfy-dev.myshopify.com - Plus相当）
4. ✅ Bogus Gateway有効化

### Phase 2: Webhook実装 🔥 (優先度: 最高)
5. ⏳ Order Created Webhook登録
   - Shopify Admin で Webhook URL設定: `https://your-tunnel.trycloudflare.com/api/webhooks/order_created`
   - Topic: `orders/create`
6. ⏳ Webhook Handler骨組み (`/app/routes/api.webhooks.order_created.tsx`)
   ```typescript
   export async function action({ request }: ActionFunctionArgs) {
     // 0) HMAC検証
     const hmac = request.headers.get('X-Shopify-Hmac-Sha256');
     const body = await request.text();
     const calculatedHmac = crypto.createHmac('sha256', process.env.SHOPIFY_API_SECRET!)
       .update(body).digest('base64');
     if (hmac !== calculatedHmac) return new Response('Forbidden', { status: 403 });

     const order = JSON.parse(body);

     // 1) すでに処理済みか？（Order Tags確認）
     const { admin } = await shopify.authenticate.admin(request);
     const existingOrder = await admin.rest.resources.Order.find({ 
       session, 
       id: order.id 
     });
     if (existingOrder.tags?.includes('crypify_rewarded')) {
       return new Response('Already processed', { status: 200 });
     }

     // 2) CDP Wallet作成 & USDC Reward送金
     const { walletAddress, txHash, rewardAmount } = await createWalletAndReward({
       email: order.email,
       totalPrice: order.total_price
     });

     // 3) Order Metafields & Tagに保存（DB代わり）
     existingOrder.tags = `${existingOrder.tags}, crypify_rewarded`;
     existingOrder.metafields = [
       { namespace: 'crypify', key: 'wallet_address', type: 'single_line_text_field', value: walletAddress },
       { namespace: 'crypify', key: 'reward_tx_hash', type: 'single_line_text_field', value: txHash },
       { namespace: 'crypify', key: 'reward_amount', type: 'number_decimal', value: String(rewardAmount) },
     ];
     await existingOrder.save({ update: true });

     // 4) JWT署名付きトークン生成
     const token = jwt.sign(
       { walletAddress, email: order.email, exp: Math.floor(Date.now() / 1000) + 3600 },
       process.env.JWT_SECRET!
     );

     // 5) メール送信
     await sendWalletEmail(order.email, token);

     return new Response('Success', { status: 200 });
   }
   ```

### Phase 3: CDP Wallet統合 🔥 (優先度: 最高)
7. ⏳ CDP環境変数設定
   - `CDP_API_KEY`, `CDP_API_SECRET`（Coinbase Developerから取得）
8. ⏳ Embedded Wallet作成関数 (`/app/utils/cdp.server.ts`)
   ```typescript
   import { Coinbase } from '@coinbase/coinbase-sdk';
   
   export async function createWalletAndReward({ email, totalPrice }) {
     const wallet = await Coinbase.createWallet({
       userId: email,
       network: 'base-sepolia'
     });
     
     const rewardAmount = parseFloat(totalPrice) * 0.1;
     const txHash = await wallet.transfer({
       amount: rewardAmount,
       asset: 'USDC',
       destination: wallet.address
     });
     
     return { walletAddress: wallet.address, txHash, rewardAmount };
   }
   ```
9. ⏳ USDC Reward送金（購入額10%）
   - Base Sepolia Testnet USDC Contract
   - Faucetで送金元に資金供給

### Phase 4: JWT署名 & メール送信 🔥 (優先度: 最高)
10. ⏳ JWT依存追加
    ```bash
    pnpm add jsonwebtoken @types/jsonwebtoken
    ```
11. ⏳ ワンタイムトークン生成（`/app/utils/token.server.ts`)
    ```typescript
    import jwt from 'jsonwebtoken';
    
    export function generateWalletToken(walletAddress: string, email: string) {
      return jwt.sign(
        { walletAddress, email, exp: Math.floor(Date.now() / 1000) + 3600 },
        process.env.JWT_SECRET!
      );
    }
    
    export function verifyWalletToken(token: string) {
      try {
        return jwt.verify(token, process.env.JWT_SECRET!);
      } catch (err) {
        throw new Error('Invalid or expired token');
      }
    }
    ```
12. ⏳ メール送信（Shopify Email API）
    - 件名: "🎉 $X.XX USDC Rewardsをプレゼント！"
    - 本文: `https://your-app.com/wallet?token=xxx`

### Phase 5: Wallet Access Page 🔄 (優先度: 高)
13. ⏳ `/app/routes/wallet.tsx` 実装
    - JWT検証、Passkey認証、OnchainKit残高表示

### Phase 6: Cloud Run早期デプロイ 🔥 (優先度: 最高)
14. ⏳ Dockerfile作成
    ```dockerfile
    FROM node:20-alpine
    WORKDIR /app
    COPY package.json pnpm-lock.yaml ./
    RUN npm install -g pnpm && pnpm install --frozen-lockfile
    COPY . .
    RUN pnpm build
    CMD ["pnpm", "start"]
    ```
15. ⏳ Cloud Runデプロイ
    ```bash
    gcloud run deploy crypify \
      --source . \
      --region us-west1 \
      --min-instances 1 \
      --max-instances 10 \
      --set-env-vars NODE_ENV=production
    ```
16. ⏳ Shopify App URLをCloud Run URLに変更
    - `shopify.app.toml` の `application_url`
    - Webhook URLも更新

### Phase 7: E2Eテスト & デモ準備 🔄 (優先度: 高)
17. ⏳ Base Sepolia 完全フローテスト
18. ⏳ デモシナリオ & プレゼン資料

### Phase 8: 本番化（ハッカソン後） 🎯
19. ⏳ Base Mainnet移行
20. ⏳ Offsite Payment Extension実装（Partner承認後）

---

## 🔑 重要な設計判断

### 1. Payment Extension の実装方法について ⚠️

**重要な発見**: Shopify CLIの `shopify app generate extension` コマンドでは**Payment Extensionを自動生成できません**。

- ❌ CLI template一覧にPayments Extensionが存在しない
- ✅ 手動で `extensions/crypify-payment/` ディレクトリを作成
- ✅ `shopify.extension.toml` を手動で記述
- ✅ 最初の実装ターゲット: `payments.offsite.render` (Offsite Payment Extension)

**Alternative Payment Extension (`payments.custom-onsite.render`) について**:
- ⚠️ **招待制 (invite-only closed beta)** - Shopify公式により明記
- ⚠️ **Payments Partner承認が前提** - 審査期間は不確定（数週間〜数ヶ月）
- ⚠️ ハッカソン期間中の承認取得は**現実的に困難**
- 💡 Offsite Extensionで実装後、承認取得次第Alternativeへ移行可能

### 2. なぜ Offsite Payment Extension か？

**比較: Theme App Extension vs Offsite Payment vs Alternative Payment**

| 項目 | Theme App Extension | Offsite Payment Extension | Alternative Payment Extension |
|------|-------------------|--------------------------|------------------------------|
| **統合場所** | 商品ページ | チェックアウト画面 | チェックアウト画面 |
| **UX** | 独自ボタン配置 | 外部ページへリダイレクト | Shopify内で完結（iframe等） |
| **実装難易度** | 低 | 中 | 高 |
| **Beta Access** | 不要 | **不要** ✅ | **必須** ⚠️ (招待制) |
| **審査期間** | 本番時のみ | 本番時のみ | **招待待ち（不確定）** |
| **ハッカソン適合性** | △ CVR低下 | **✅ 最適** | ❌ 期間内に間に合わない |
| **本番移行** | 困難 | **✅ Alternativeへ移行可能** | ✅ 最終形態 |

**ハッカソン戦略**:
1. ✅ **Phase 1 (ハッカソン中)**: Offsite Payment Extensionで完全動作デモ作成
   - Beta access不要で即座に実装開始可能
   - 外部リダイレクトでもShopify公式決済フローに統合
   - 実際のUSDC転送を含む完全な決済体験を実装

2. 🎯 **Phase 2 (ハッカソン後)**: Payments Partner申請 & Alternative移行
   - 既存のAPI実装をそのまま活用（`payment_session_url`等は共通）
   - `shopify.extension.toml`の`target`を`payments.offsite.render` → `payments.custom-onsite.render`に変更
   - UX向上（外部リダイレクト不要に）

**結論**: Offsite → Alternative の段階的移行がリスク最小・価値最大

### 3. なぜ リダイレクト方式 (Offsite) か？

**Offsite Payment Extensionの仕組み**:
1. Shopifyチェックアウトで「Crypto (USDC on Base)」を選択
2. **Shopifyが自動的に外部決済ページへリダイレクト** (`payment_session_url`で指定)
3. 外部ページ（Remix App）でCDP統合の決済処理
4. 完了後、Shopifyへリダイレクトバック

**技術的制約と解決策**:

```diff
- Checkout UI Extension (Web Worker) の制約:
  ❌ DOM API (document, window)
  ❌ Coinbase Wallet SDK
  ❌ OnchainKit Components
  ❌ CDP Server Wallets SDK
  
+ Offsite Payment Extension (外部ページ) の利点:
  ✅ Remix App内でフルスタックJavaScript実行
  ✅ OnchainKit / wagmi / viem 使用可能
  ✅ CDP SDK フル機能利用
  ✅ React/Next.js等のモダンフレームワーク利用可能
  ✅ Shopify公式決済フローに統合（非公式の外部リンクではない）
```

**Alternative Paymentとの違い**:
- Offsite: 外部ページで決済処理（`https://your-app.com/pay/123`）
- Alternative: Shopify内でiframe/埋め込みで決済処理（UX最適だがBeta access必須）

### 4. なぜ Base Chain か？

| 項目 | Ethereum Mainnet | Base (Coinbase L2) |
|------|------------------|-------------------|
| **ガス代** | $5-50 (混雑時) | $0.001-0.01 |
| **確認時間** | 1-5分 | 2-4秒 |
| **マイクロペイメント** | 不可能 | 可能（$1以下も採算性あり） |
| **CDP統合** | 通常サポート | ネイティブ統合（Coinbase運営） |

**結論**: マイクロペイメント対応 + UX最適化のためBase一択

---

## CDP and pkg name

### crypify の対応

| CDP製品 | パッケージ | 実装状況 | 賞適格 |
|---------|----------|---------|--------|
| **1. Server Wallets v2** | `@coinbase/coinbase-sdk` | ✅ 完全実装 | ✅ |
| **2. Embedded Wallets** | `@base-org/account` | ✅ 完全実装 | ✅ |
| **3. Onramp API** | `@coinbase/onchainkit` | ✅ 完全実装 | ✅ |
| **4. Trade API** | `@coinbase/coinbase-sdk` | ✅ SDK内蔵 | ✅ |
| **5. x402 Protocol** | `@coinbase/x402` | △ パッケージのみ | ✅ |
| **6. OnchainKit** | `@coinbase/onchainkit` | ✅ 完全実装 | ✅ |

---

## 🔐 セキュリティ設計

### 署名付きワンタイムトークン（重要）

**問題**: `/wallet/:customerId` のような直URLは列挙攻撃・なりすましリスクあり

**解決策**: JWT/HMAC署名付きトークンで保護
```typescript
// トークン生成（Webhook内）
import jwt from 'jsonwebtoken';
const token = jwt.sign(
  { 
    walletAddress: wallet.address,
    email: order.email,
    exp: Math.floor(Date.now() / 1000) + 3600 // 1時間有効
  },
  process.env.JWT_SECRET!
);
const walletLink = `https://your-app.com/wallet?token=${token}`;

// トークン検証（Wallet Pageロード時）
const decoded = jwt.verify(token, process.env.JWT_SECRET!);
if (decoded.exp < Date.now() / 1000) throw new Error('Token expired');
```

### 秘密鍵管理フロー

```
┌───────────────────────────────────────────────────────┐
│        Merchant (店舗側)                               │
│                                                       │
│  CDP Server Wallets v2                                │
│    ↓                                                  │
│  AWS Nitro Enclave TEE                                │
│    └─ 秘密鍵保管 (クライアント非公開)                  │
│                                                       │
│  Remix App Backend                                    │
│    └─ CDP API Key (環境変数)                          │
└───────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────┐
│        Customer (ユーザー側)                           │
│                                                       │
│  Embedded Wallets (Base Account SDK)                  │
│    ↓                                                  │
│  Passkey Authentication (Face ID / Touch ID)          │
│    └─ Smart Wallet自動生成                            │
│    └─ シードフレーズ不要                              │
└───────────────────────────────────────────────────────┘
```

### 環境変数管理

**GCP Secret Manager 使用推奨**:
```bash
# 本番環境
CDP_API_KEY=organizations/xxx/apiKeys/yyy (Secret Manager)
CDP_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY----- (Secret Manager)
SUPABASE_URL=https://xxx.supabase.co (Cloud Run環境変数)
SUPABASE_ANON_KEY=eyJhbG... (Secret Manager)
SHOPIFY_API_SECRET_KEY=shpss_xxx (Secret Manager)
```

**開発環境**:
```bash
# .env.local (gitignore済み)
CDP_API_KEY=organizations/xxx/apiKeys/yyy
CDP_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SHOPIFY_API_SECRET_KEY=shpss_xxx
```

---

## 📊 データ永続化（Shopify Order Metafields）

### Order Metafields Schema（DB代わり）

**Tag**: `crypify_rewarded`（冪等性フラグ）

**Metafields**:
```typescript
{
  namespace: 'crypify',
  key: 'wallet_address',
  type: 'single_line_text_field',
  value: '0x1234...abcd' // Wallet Address
}

{
  namespace: 'crypify',
  key: 'reward_tx_hash',
  type: 'single_line_text_field',
  value: '0xabcd...1234' // Base Sepolia Transaction Hash
}

{
  namespace: 'crypify',
  key: 'reward_amount',
  type: 'number_decimal',
  value: '1.50' // USDC Reward Amount
}
```

**Shopify Admin REST APIで保存**:
```typescript
const order = await admin.rest.resources.Order.find({ session, id: orderId });
order.tags = `${order.tags}, crypify_rewarded`;
order.metafields = [
  { namespace: 'crypify', key: 'wallet_address', type: 'single_line_text_field', value: walletAddress },
  { namespace: 'crypify', key: 'reward_tx_hash', type: 'single_line_text_field', value: txHash },
  { namespace: 'crypify', key: 'reward_amount', type: 'number_decimal', value: String(rewardAmount) },
];
await order.save({ update: true });
```

**利点**:
- ✅ 外部DB不要
- ✅ Shopify管理画面で直接確認可能
- ✅ GraphQL/REST APIで簡単に取得可能

---

## 🚀 デプロイ戦略

### Phase 1: 開発初期 - Cloudflare Tunnel ✅
- ✅ 現在稼働中: `https://silk-farmers-genetics-harvard.trycloudflare.com`
- Webhook動作確認、CDP統合テスト

### Phase 2: ハッカソン中盤 - Cloud Run移行 🔥

**理由**: デモ詰みリスク回避、本番URLで安定稼働

#### Dockerfile作成
```dockerfile
FROM node:20-alpine
WORKDIR /app

# pnpm インストール
RUN npm install -g pnpm

# 依存関係インストール
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# アプリコピー & ビルド
COPY . .
RUN pnpm build

# 環境変数（Cloud Runで上書き）
ENV NODE_ENV=production
ENV PORT=8080

CMD ["pnpm", "start"]
```

#### Cloud Runデプロイ
```bash
# Docker イメージビルド & プッシュ
gcloud builds submit --tag gcr.io/PROJECT_ID/crypify

# Cloud Runデプロイ（DB無しなので超簡単）
gcloud run deploy crypify \
  --image gcr.io/PROJECT_ID/crypify \
  --region us-west1 \
  --platform managed \
  --min-instances 1 \
  --max-instances 10 \
  --concurrency 5 \
  --set-env-vars NODE_ENV=production \
  --set-env-vars SHOPIFY_API_KEY=xxx \
  --set-env-vars SHOPIFY_API_SECRET=xxx \
  --set-env-vars CDP_API_KEY=xxx \
  --set-env-vars CDP_API_SECRET=xxx \
  --set-env-vars JWT_SECRET=xxx
```

#### Shopify App URL更新
```toml
# shopify.app.toml
application_url = "https://crypify-xxx.run.app"
embedded = true

[webhooks]
api_version = "2025-01"

[[webhooks.subscriptions]]
topics = ["orders/create"]
uri = "https://crypify-xxx.run.app/api/webhooks/order_created"
```

### Phase 3: 本番化（ハッカソン後）

#### GCP Cloud Run 本番設定

```yaml
service: crypify
region: us-west1  # Supabaseと同一リージョン推奨

resources:
  cpu: 1
  memory: 512Mi

autoscaling:
  minInstances: 1    # コールドスタート回避
  maxInstances: 10   # Supabase接続プール連動

environment:
  NODE_ENV: production
  PORT: 8080

secrets:
  CDP_API_KEY: latest
  CDP_PRIVATE_KEY: latest
  SUPABASE_ANON_KEY: latest
  SHOPIFY_API_SECRET_KEY: latest
```

### CI/CD Pipeline (ハッカソン後)

```yaml
name: Deploy to Cloud Run
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: google-github-actions/setup-gcloud@v1
      - run: gcloud builds submit --tag gcr.io/${{ secrets.GCP_PROJECT_ID }}/crypify
      - run: |
          gcloud run deploy crypify \
            --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/crypify \
            --region us-west1 \
            --min-instances 1 \
            --max-instances 10
```

---

## 🎯 ハッカソン最小構成まとめ

### 削除したもの（デプロイリスク削減）
- ❌ Supabase / PostgreSQL
- ❌ Drizzle ORM / Prisma
- ❌ DATABASE_URL
- ❌ マイグレーション
- ❌ 接続プール管理

### 代わりに採用したもの（最小＆強力）
- ✅ **Shopify Order Tags**（冪等性フラグ）
- ✅ **Shopify Order Metafields**（Wallet情報永続化）
- ✅ **JWT署名トークン**（Wallet URLセキュリティ）
- ✅ **Cloud Run早期デプロイ**（デモ詰み回避）

### 技術スタック（最終版）
- Remix（一本化）
- @coinbase/coinbase-sdk（CDP Embedded Wallets）
- @base-org/account（Passkey認証）
- @coinbase/onchainkit（UI Components）
- jsonwebtoken（JWT署名）
- Shopify Admin REST API（Order Metafields操作）
- GCP Cloud Run（Hosting）

### 実装優先度
1. 🔥 Webhook Handler（HMAC検証 + Order Tags/Metafields）
2. 🔥 CDP Wallet作成 + USDC Reward送金
3. 🔥 JWT署名トークン生成
4. 🔥 Cloud Runデプロイ
5. 🔄 Wallet Access Page（JWT検証 + Passkey認証）
6. 🔄 E2Eテスト（Base Sepolia）
7. 🎯 デモ & プレゼン資料
