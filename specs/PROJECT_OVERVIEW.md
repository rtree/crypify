# crypify - プロジェクト全体構造ドキュメント

**作成日**: 2025-11-21  
**最終更新**: 2025-11-22  
**Dev Store**: crypfy-dev.myshopify.com (Development Store - Plus相当)  
**プロジェクト種別**: Shopify Webhook + CDP Embedded Wallets (Remix一本化、Supabase+Drizzle)

**ハッカソン戦略（最小構成）**: 
- 🎯 **Hackathon Goal**: Bogus決済 → Webhook → CDP Wallet自動発行 → USDC Reward → メール → Passkey認証
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

### 将来版フロー（Offsite Payment Extension）⏰ ※Partner承認後

```
┌─────────────────────────────────────────────────────────────┐
│    Shopify Checkout - Offsite Payment Extension            │
│                                                             │
│  支払い方法選択:                                            │
│  ● Credit Card / Bogus Gateway                              │
│  ● Crypto (USDC on Base) ← crypify                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
           (外部決済ページへリダイレクト)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│         Crypto Payment Page (Remix App)                     │
│                                                             │
│  1. Wallet接続 or OnchainKit Onramp                         │
│  2. USDC支払い実行（Base Chain）                            │
│  3. Shopifyへリダイレクトバック → 注文確定                  │
└─────────────────────────────────────────────────────────────┘

⚠️ **Payments Partner承認が必須** - ハッカソン後に申請
```

### コンポーネント構成（ハッカソン最小版）

#### 1. Order Created Webhook Handler (Remix Action)
- **役割**: Shopify購入完了時にCDP Wallet自動発行
- **処理フロー**:
  1. HMAC署名検証（Shopify公式ヘッダー）
  2. Idempotency確認（order_id重複チェック）
  3. CDP Embedded Wallet作成（@coinbase/coinbase-sdk）
  4. 購入額10%のUSDC Reward送金（Base Sepolia）
  5. 署名付きワンタイムトークン生成
  6. メール送信（Shopify Email API）
- **技術**: Remix + @coinbase/coinbase-sdk

#### 2. Wallet Access Page (Remix Route)
- **役割**: ユーザーがPasskeyでWalletにアクセス
- **URL**: `/wallet?token=xxx` (JWT/HMAC署名付き)
- **機能**:
  - トークン検証（有効期限、改ざんチェック）
  - Passkey認証（@base-org/account）
  - USDC残高表示（OnchainKit）
  - トランザクション履歴
- **技術**: Remix + OnchainKit + @base-org/account

#### 3. Supabase (Database - Drizzle ORM)
- **役割**: Wallet情報、Order履歴、トークン管理
- **ORMをPrisma→Drizzleに変更した理由**:
  - Supabase Transaction Mode（pgbouncer）とPrismaの相性問題回避
  - ハッカソンでの軽量性・迅速性重視
- **スキーマ**: 後述

#### 4. CDP Embedded Wallets (Coinbase Infrastructure)
- **役割**: ユーザーWallet管理（秘密鍵はCoinbase側で管理）
- **認証**: Passkey（Face ID / Touch ID）
- **Chain**: Base Sepolia (テスト) → Base Mainnet (本番)

#### 5. GCP Cloud Run (Hosting - ハッカソン後)
- ハッカソン中は **Cloudflare Tunnel** で十分
- 本番化時にCloud Run移行

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
| `@supabase/supabase-js` | 2.84.0 | DB Client | Transaction Mode |
| `drizzle-orm` | latest | ORM | Supabase互換、軽量 |
| `drizzle-kit` | latest | Migration Tool | Schema管理 |
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
   // HMAC署名検証
   const hmac = request.headers.get('X-Shopify-Hmac-Sha256');
   // Idempotency（order_id重複チェック）
   // CDP Wallet作成
   // USDC Reward送金
   // 署名付きトークン生成
   // メール送信
   ```

### Phase 3: CDP Wallet統合 🔥 (優先度: 最高)
7. ⏳ CDP環境変数設定
   - `CDP_API_KEY`, `CDP_API_SECRET`（Coinbase Developerから取得）
8. ⏳ Embedded Wallet作成関数
   ```typescript
   import { Coinbase } from '@coinbase/coinbase-sdk';
   const wallet = await Coinbase.createWallet({
     userId: email,
     network: 'base-sepolia'
   });
   ```
9. ⏳ USDC Reward送金（購入額10%）
   - Base Sepolia Testnet USDC Contract
   - Faucetで送金元に資金供給

### Phase 4: 署名付きトークン & DB 🔥 (優先度: 最高)
10. ⏳ Drizzle ORM セットアップ
    ```bash
    pnpm add drizzle-orm postgres
    pnpm add -D drizzle-kit
    ```
11. ⏳ Schema定義 (`db/schema.ts`)
    ```typescript
    export const customerWallets = pgTable('customer_wallets', {
      id: uuid('id').primaryKey().defaultRandom(),
      orderId: text('order_id').unique().notNull(), // Idempotency用
      email: text('email').notNull(),
      walletAddress: text('wallet_address').notNull(),
      totalRewards: numeric('total_rewards', { precision: 18, scale: 6 }),
      createdAt: timestamp('created_at').defaultNow()
    });
    ```
12. ⏳ ワンタイムトークン生成（`/app/utils/token.ts`)
    ```typescript
    import jwt from 'jsonwebtoken';
    const token = jwt.sign(
      { walletAddress, email, exp: Math.floor(Date.now() / 1000) + 3600 },
      process.env.JWT_SECRET
    );
    ```

### Phase 5: Wallet Access Page 🔄 (優先度: 高)
13. ⏳ `/app/routes/wallet.tsx` 実装
    - クエリパラメータ `token` 検証
    - Passkey認証（@base-org/account）
    - OnchainKit で残高表示
14. ⏳ メールテンプレート
    - 件名: "🎉 $X.XX USDC Rewardsをプレゼント！"
    - リンク: `https://your-app.com/wallet?token=xxx`

### Phase 6: E2Eテスト 🔄 (優先度: 高)
15. ⏳ Base Sepolia テスト
    - Dev Storeで購入 → Webhook受信 → Wallet作成 → メール送信 → Walletアクセス
16. ⏳ デモシナリオ作成
17. ⏳ プレゼン資料

### Phase 7: 本番化（ハッカソン後） 🎯
18. ⏳ Base Mainnet移行
19. ⏳ Offsite Payment Extension実装（Partner承認後）
20. ⏳ GCP Cloud Run デプロイ

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

### 3. なぜ Drizzle ORM か？

**ハッカソンでの選定理由**:
- ✅ **Supabase Transaction Mode（pgbouncer）と完全互換**
  - PrismaはPrepared Statementsでハマりやすい
- ✅ **軽量・高速** - ハッカソンの迅速性重視
- ✅ **TypeScript-first** - 型安全性維持
- ✅ **シンプルなマイグレーション** - `drizzle-kit push`で即座に反映

**Supabase接続設定**:
```typescript
// Transaction Mode (Port 6543) 推奨
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL!, { 
  max: 1, // Serverless環境では1接続推奨
  prepare: false // pgbouncer互換
});
export const db = drizzle(client);
```

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

## 📊 データベーススキーマ（Drizzle ORM）

### Supabase Tables

#### 1. `customer_wallets` テーブル（ハッカソン最小版）
```typescript
// db/schema.ts
import { pgTable, uuid, text, numeric, timestamp } from 'drizzle-orm/pg-core';

export const customerWallets = pgTable('customer_wallets', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: text('order_id').unique().notNull(), // Idempotency用（重複防止）
  email: text('email').notNull(),
  walletAddress: text('wallet_address').notNull(),
  rewardAmount: numeric('reward_amount', { precision: 18, scale: 6 }).notNull(),
  txHash: text('tx_hash'), // Base Chain Transaction Hash
  status: text('status').notNull().default('pending'), // pending | completed | failed
  createdAt: timestamp('created_at').defaultNow(),
});

// Index
import { index } from 'drizzle-orm/pg-core';
export const orderIdIdx = index('order_id_idx').on(customerWallets.orderId);
export const emailIdx = index('email_idx').on(customerWallets.email);
```

#### マイグレーション実行
```bash
# Schema生成
pnpm drizzle-kit generate:pg

# Supabaseに適用
pnpm drizzle-kit push:pg
```

---

## 🚀 デプロイ戦略

### ハッカソン中: Cloudflare Tunnel
- ✅ 現在稼働中: `https://silk-farmers-genetics-harvard.trycloudflare.com`
- 開発環境で十分（無料、即座に使える）

### ハッカソン後: GCP Cloud Run 設定

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

### CI/CD Pipeline (GitHub Actions)

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
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
      - name: Build Docker Image
        run: docker build -t gcr.io/${{ secrets.GCP_PROJECT_ID }}/crypify .
      - name: Push to GCR
        run: docker push gcr.io/${{ secrets.GCP_PROJECT_ID }}/crypify
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy crypify \
            --image gcr.io/${{ secrets.GCP_PROJECT_ID }}/crypify \
            --region us-west1 \
            --min-instances 0 \
            --max-instances 10
```
