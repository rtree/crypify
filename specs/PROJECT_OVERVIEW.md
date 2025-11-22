# crypify - プロジェクト全体構造ドキュメント

**作成日**: 2025-11-21  
**最終更新**: 2025-11-22  
**Dev Store**: crypfy-dev.myshopify.com (Development Store - Plus相当)  
**プロジェクト種別**: Shopify Webhook + CDP Embedded Wallets

**ハッカソン戦略**: 
- 🎯 **Phase 1**: Bogus決済 → Wallet自動発行 → メール通知（ハッカソン本番）
- ⏰ **Phase 2**: Wallet払い機能追加（時間あれば）
- 🚀 **Phase 3**: 本番化・Base Mainnet移行（ハッカソン後）

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
│         Wallet Access Page (/wallet/:customerId)            │
│                                                             │
│  1. Passkey認証 (Face ID / Touch ID)                        │
│  2. Embedded Wallet表示 (OnchainKit)                        │
│     - USDC残高表示                                          │
│     - トランザクション履歴                                  │
│  3. (将来) 次回購入時に使うボタン                           │
└─────────────────────────────────────────────────────────────┘
```

### 将来版フロー（Wallet払い対応）⏰

```
┌─────────────────────────────────────────────────────────────┐
│         Checkout UI Extension - crypify Button              │
│                                                             │
│  [ 💰 Pay with your Crypto Wallet ($X.XX USDC available) ]  │
└─────────────────────────────────────────────────────────────┘
                          ↓
                  (ボタンクリック)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│         Wallet Payment Page (/app/pay-wallet/:token)        │
│                                                             │
│  1. Passkey認証                                             │
│  2. USDC残高確認                                            │
│  3. 支払い実行 (CDP SDK)                                    │
│  4. Admin API経由で注文確定                                 │
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

## 📋 実装ステップ（ハッカソン版）

### Phase 1: 基盤構築 ✅
1. ✅ Shopify App作成 (`pnpm create @shopify/app@latest`)
2. ✅ 開発環境セットアップ
3. ✅ Dev Store準備（crypfy-dev.myshopify.com - Plus相当）
4. ✅ Bogus Gateway有効化

### Phase 2: Webhook & Wallet自動発行 🔄 (優先度: 最高)
5. ⏳ Order Created Webhook登録
   - `/api/webhooks/order_created` エンドポイント作成
   - Shopify Admin APIでWebhook設定
6. ⏳ CDP Embedded Wallet統合
   - `@coinbase/coinbase-sdk` で Wallet作成
   - 顧客メールアドレスをユーザーIDに紐付け
7. ⏳ USDC Airdrop機能
   - 購入額の10%計算
   - Base Sepoliaで送金（テスト用USDC）
8. ⏳ Prisma Schema追加
   ```prisma
   model CustomerWallet {
     id           String   @id @default(uuid())
     customerId   String   @unique
     email        String
     walletAddress String
     totalRewards  Decimal
     createdAt    DateTime @default(now())
   }
   ```

### Phase 3: メール通知 🔄 (優先度: 高)
9. ⏳ メールテンプレート作成
   - 件名: "🎉 $X.XX USDC Crypto Walletをプレゼント！"
   - 本文: Walletアクセスリンク + 使い方ガイド
10. ⏳ SendGrid or Shopify Email統合
11. ⏳ Webhook → メール送信フロー完成

### Phase 4: Wallet UI 🔄 (優先度: 高)
12. ⏳ Wallet Access Page (`/app/wallet/:customerId`)
    - Passkey認証UI (OnchainKit)
    - USDC残高表示
    - トランザクション履歴
    - QRコード表示（将来用）
13. ⏳ 認証フロー実装
    - CDP Embedded Wallets Auth
    - セッション管理

### Phase 5: テスト & デモ準備 🔄 (優先度: 中)
14. ⏳ E2Eテスト（Base Sepolia）
    - Dev Storeで購入
    - Webhook受信確認
    - Wallet作成確認
    - メール受信確認
    - Walletアクセス確認
15. ⏳ デモシナリオ作成
16. ⏳ ハッカソンプレゼン資料

### Phase 6: Wallet払い機能（時間あれば） ⏰ (優先度: 低)
17. ⏳ Checkout UI Extension - Wallet残高表示
18. ⏳ Wallet Payment Page (`/app/pay-wallet/:token`)
19. ⏳ Admin API経由で注文作成
20. ⏳ 残高減算処理

### Phase 7: 本番化（ハッカソン後） 🎯
21. ⏳ Base Mainnet移行
22. ⏳ 本番USDC対応
23. ⏳ GCP Cloud Run デプロイ
24. ⏳ セキュリティ監査

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
