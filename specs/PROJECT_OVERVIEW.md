# crypify - プロジェクト全体構造ドキュメント

**作成日**: 2025-11-21  
**プロジェクト種別**: Shopify Payment Extension (Alternative Payment)

---

## 📌 プロジェクト概要

### 目的
ShopifyのネイティブチェックアウトにCrypto決済（USDC on Base）を統合し、Coinbase CDPを活用した次世代決済体験を提供する。

### 解決する課題
| 課題 | 従来の問題 | crypify の解決策 |
|------|-----------|----------------|
| **Crypto普及の壁 (Buyer)** | ウォレット必須 → 普及率5%未満 | Onramp統合 → カードでUSDC購入可能（普及率95%） |
| **Crypto普及の壁 (Seller)** | 複雑な統合 | Shopify公式チェックアウトに自動統合 |
| **CVR低下** | 外部リダイレクト → CVR 30-40%低下 | 同一ドメイン内完結 → CVR維持 |
| **高ガス代** | Ethereum Mainnet → $5-50 | Base L2 → $0.001-0.01 |

---

## 🏗️ システムアーキテクチャ

### 全体フロー

```
┌─────────────────────────────────────────────────────────────┐
│              Shopify Checkout (Standard UI)                 │
│                                                             │
│  支払い方法を選択:                                          │
│  ○ クレジットカード                                         │
│  ○ PayPal                                                   │
│  ● Crypto (USDC on Base) ← crypify                         │
│                                                             │
│  [ Pay Now ] ボタンをクリック                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
                (Shopify が自動リダイレクト)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│         crypify Payment Page (Remix App)                    │
│         URL: /app/pay/:paymentId                            │
│                                                             │
│  ┌───────────────────────────────────────────────────┐     │
│  │  Total: $20.00 USDC                               │     │
│  │                                                   │     │
│  │  [ Connect Wallet ] (OnchainKit)                  │     │
│  │         OR                                        │     │
│  │  [ Buy USDC with Card ] (Onramp)                  │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
│  1. ユーザーがウォレット接続 or Onramp実行                  │
│  2. Base Chain (Chain ID: 8453) で USDC送金                │
│  3. paymentSessionResolve() 呼び出し                        │
│  4. 完了後、自動的にShopifyへリダイレクト                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
                 (決済完了通知 via Webhook)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              Shopify (Order Confirmed)                      │
└─────────────────────────────────────────────────────────────┘
```

### コンポーネント構成

#### 1. Shopify Payment Extension (Backend)
- **役割**: 決済プロバイダーとしてShopifyに登録
- **API**: 
  - `payment_session_url`: 決済セッション作成
  - `refund_session_url`: 返金処理
  - `confirm_session_url`: 決済確認（オプション）
- **技術**: Remix Actionハンドラー

#### 2. Checkout UI Extension (Frontend - Web Worker)
- **役割**: チェックアウト画面にロゴ・説明文表示、リダイレクトボタン提供
- **制約**: Web Worker環境のため、DOM API / CDP SDK 使用不可
- **技術**: Preact (Shopify デフォルトレンダラー)

#### 3. Payment Page (Remix App)
- **役割**: Crypto決済の実行
- **機能**:
  - OnchainKit Walletコンポーネント統合
  - Onramp API による クレカ→USDC変換
  - Base Chain トランザクション送信
  - Supabase へのトランザクション記録
- **技術**: React + OnchainKit + wagmi/viem

#### 4. CDP Server Wallets (Backend)
- **役割**: マーチャントのウォレット管理
- **セキュリティ**: AWS Nitro Enclave TEE で秘密鍵管理
- **技術**: `@coinbase/coinbase-sdk` v2 (v0.25.0)

#### 5. Supabase (Database)
- **役割**: トランザクション履歴、決済セッション、返金記録
- **接続モード**: Transaction Mode (Port 6543) + Prepared Statements無効化
- **スキーマ**:
  - `transactions`: 決済トランザクション
  - `refunds`: 返金記録
  - `payment_sessions`: キャッシュ用

#### 6. GCP Cloud Run (Hosting)
- **設定**:
  - Min instances: 0 (コールドスタート)
  - Max instances: 10 (Supabase接続プール連動)
  - Memory: 512MB
- **CI/CD**: GitHub Actions

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
| `next` | 15.5.6 | React Framework | Shopify App内部 |
| `react` | 18.3.1 | UI Library | OnchainKit依存 |
| `typescript` | 5.7.3 | Type Safety | strictモード |

### ⚠️ 禁止パッケージ
- ❌ `@coinbase/cdp-sdk` (v1 - deprecated)
- ❌ `ethers` (v5系 - wagmi/viemで代替)

---

## 📋 実装ステップ

### Phase 1: プロジェクト初期化 ✅
1. ✅ Shopify App作成 (`pnpm create @shopify/app@latest`)
2. ✅ 開発環境セットアップ（環境変数、Supabase接続）
3. ✅ Payment Extension手動作成（CLIでは生成不可のため）

### Phase 2: Backend API実装 ✅
4. ✅ Payment Session Handler (`/api/payment_session`)
5. ⏳ Payment Resolve API (`/api/payment/resolve`) - 次のステップ
6. ✅ Refund Session Handler (`/api/refund_session`)
7. ✅ Confirmation Callback Handler (`/api/confirmation_callback`)
8. ✅ Capture Session Handler (`/api/capture_session`) - オプション
9. ✅ Void Session Handler (`/api/void_session`) - オプション
10. ✅ Prisma Schema拡張（PaymentSession, RefundSession, CaptureSession, VoidSession）

### Phase 3: Frontend実装
8. Checkout UI Extension（ロゴ・説明文のみ）
9. Payment Page (`/app/pay/:paymentId`)
   - OnchainKit統合
   - Wallet接続フロー
   - Onrampフロー
   - Transaction送信

### Phase 4: CDP統合
10. Server Wallets v2 セットアップ
11. Embedded Wallets 統合
12. Onramp API設定
13. Gas Sponsorship有効化（推奨）

### Phase 5: テスト & デプロイ
14. Base Sepolia (Testnet) でE2Eテスト
15. GCP Cloud Run デプロイ
16. Shopify Dev Store統合テスト
17. Base Mainnet移行

---

## 🔑 重要な設計判断

### 1. Payment Extension の実装方法について ⚠️

**重要な発見**: Shopify CLIの `shopify app generate extension` コマンドでは**Payment Extensionを自動生成できません**。

- ❌ CLI template一覧にPayments Extensionが存在しない
- ✅ 手動で `extensions/crypify-payment/` ディレクトリを作成
- ✅ `shopify.extension.toml` を手動で記述
- ✅ ソースコード調査により `payments.custom-onsite.render` ターゲットを確認

### 2. なぜ Payment Extension (Alternative Payment) か？

**比較: Theme App Extension (従来型) vs Payment Extension**

| 項目 | Theme App Extension | Payment Extension |
|------|-------------------|-------------------|
| **統合場所** | 商品ページ | チェックアウト画面 |
| **UX** | 独自ボタン配置 | Shopify標準UI統合 |
| **CVR** | 外部リダイレクトで低下 | 同一ドメイン内で維持 |
| **信頼性** | カスタムUI | Shopify公式決済方法 |
| **審査** | 本番リリース時必要 | Dev Storeは不要 |

**結論**: Payment Extensionがハッカソン + 本番運用の両面で最適

### 3. なぜ リダイレクト方式 か？

**制約**: Checkout UI ExtensionはWeb Worker環境

```diff
- Web Worker環境でできないこと:
  ❌ DOM API (document, window)
  ❌ Coinbase Wallet SDK
  ❌ OnchainKit Components
  ❌ CDP Server Wallets SDK
  
+ リダイレクト方式でできること:
  ✅ Remix App内でフルスタックJavaScript
  ✅ OnchainKit / wagmi / viem 使用可能
  ✅ CDP SDK フル機能利用
  ✅ 同一ドメイン内でUX維持
```

### 4. なぜ Base Chain か？

| 項目 | Ethereum Mainnet | Base (Coinbase L2) |
|------|------------------|-------------------|
| **ガス代** | $5-50 (混雑時) | $0.001-0.01 |
| **確認時間** | 1-5分 | 2-4秒 |
| **マイクロペイメント** | 不可能 | 可能（$1以下も採算性あり） |
| **CDP統合** | 通常サポート | ネイティブ統合（Coinbase運営） |

**結論**: マイクロペイメント対応 + UX最適化のためBase一択

### 5. なぜ Supabase Transaction Mode か？

**Cloud Run (Serverless) の特性**:
- 同時接続数が変動
- 短命な接続を大量生成
- Connection Pooling必須

**Supabase接続モード比較**:

| モード | Port | 用途 | Cloud Run適合性 |
|-------|------|------|---------------|
| Direct | 5432 | 長期接続 | ❌ 非推奨 |
| Session Mode | 5432 | Pooling (全機能) | △ 接続数制限 |
| **Transaction Mode** | **6543** | **Pooling (最小)** | **✅ 推奨** |

**重要な制約**: Transaction ModeではPrepared Statements非サポート
→ 対策: `DATABASE_URL` に `?pgbouncer=true` を追加

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

## 📊 データベーススキーマ

### Supabase Tables

#### 1. `transactions` テーブル
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,           -- Shopify Payment Session ID
  tx_hash TEXT,                        -- Base Chain Transaction Hash
  amount DECIMAL(18, 6) NOT NULL,      -- USDC Amount
  currency TEXT NOT NULL DEFAULT 'USDC',
  status TEXT NOT NULL,                -- pending | completed | failed
  from_address TEXT,                   -- User Wallet Address
  to_address TEXT NOT NULL,            -- Merchant Wallet Address
  metadata JSONB,                      -- Shopify Order詳細
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_session_id ON transactions(session_id);
CREATE INDEX idx_transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX idx_transactions_status ON transactions(status);
```

#### 2. `refunds` テーブル
```sql
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_session_id TEXT NOT NULL,
  original_transaction_id UUID REFERENCES transactions(id),
  amount DECIMAL(18, 6) NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL,               -- pending | completed | failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. `payment_sessions` テーブル
```sql
CREATE TABLE payment_sessions (
  session_id TEXT PRIMARY KEY,
  amount DECIMAL(18, 6) NOT NULL,
  currency TEXT NOT NULL,
  redirect_url TEXT NOT NULL,
  metadata JSONB,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_sessions_expires_at ON payment_sessions(expires_at);
```

---

## 🚀 デプロイ戦略

### GCP Cloud Run 設定

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
