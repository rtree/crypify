# crypfy ディレクトリ構成

**最終更新**: 2025-11-21

---

## 📁 全体構成

```
/home/araki/crypfy/                    # プロジェクトルート
├── frontend-payext/                    # Shopify Payment Extension (Gitサブモジュール)
│   ├── app/                            # Remix App コード
│   │   ├── routes/                     # ルート定義
│   │   │   ├── _index/                 # ホームページ
│   │   │   ├── app._index.tsx         # App管理画面トップ
│   │   │   ├── app.additional.tsx     # 追加設定
│   │   │   ├── app.tsx                # App Layout
│   │   │   ├── auth.$.tsx             # 認証処理
│   │   │   ├── auth.login/            # ログイン
│   │   │   ├── webhooks.app.scopes_update.tsx
│   │   │   └── webhooks.app.uninstalled.tsx
│   │   ├── db.server.ts               # データベースクライアント
│   │   ├── entry.server.tsx           # サーバーエントリーポイント
│   │   ├── globals.d.ts               # TypeScript型定義
│   │   ├── root.tsx                   # ルートコンポーネント
│   │   ├── routes.ts                  # ルート設定
│   │   └── shopify.server.ts          # Shopify API クライアント
│   │
│   ├── extensions/                     # Shopify Extensions
│   │   ├── crypfy-checkout-ui/        # Checkout UI Extension ✅
│   │   │   ├── src/
│   │   │   │   └── Checkout.jsx
│   │   │   ├── locales/
│   │   │   │   ├── en.default.json
│   │   │   │   └── fr.json
│   │   │   └── shopify.extension.toml
│   │   └── crypfy-payment/            # Payment Extension ✅ (手動作成)
│   │       └── shopify.extension.toml
│   │
│   ├── prisma/                         # データベーススキーマ
│   │   ├── migrations/                 # マイグレーションファイル
│   │   │   ├── 20240530213853_create_session_table/
│   │   │   └── 20251122031613_add_payment_models/ ✅
│   │   └── schema.prisma              # Prismaスキーマ定義 ✅
│   │
│   ├── public/                         # 静的ファイル
│   │   └── favicon.ico
│   │
│   ├── .cursor/                        # Cursor IDE設定
│   ├── .gemini/                        # Gemini MCP設定
│   ├── .dockerignore
│   ├── .editorconfig
│   ├── .eslintignore
│   ├── .eslintrc.cjs
│   ├── .gitignore
│   ├── .graphqlrc.ts
│   ├── .mcp.json
│   ├── .npmrc
│   ├── .prettierignore
│   ├── CHANGELOG.md
│   ├── Dockerfile
│   ├── README.md
│   ├── env.d.ts
│   ├── package.json                    # 依存関係定義
│   ├── pnpm-lock.yaml                 # pnpm ロックファイル
│   ├── pnpm-workspace.yaml
│   ├── shopify.app.toml               # Shopify App設定
│   ├── shopify.web.toml
│   ├── tsconfig.json                  # TypeScript設定
│   └── vite.config.ts                 # Vite設定
│
├── specs/                              # プロジェクトドキュメント
│   ├── 000-START.md                   # ハッカソンキックオフ指示
│   ├── PROJECT_OVERVIEW.md            # プロジェクト全体像
│   └── DIRECTORY_STRUCTURE.md         # このファイル
│
├── dirforcaching/                      # オフラインパッケージキャッシュ
│   ├── package.json
│   └── pnpm-lock.yaml
│
├── .gitmodules                         # Gitサブモジュール設定
└── README.md                           # プロジェクトREADME
```

---

## 🎯 カレントディレクトリ参照

### Payment Extension 生成時

```bash
# 必ず以下のディレクトリで実行:
cd /home/araki/crypfy/frontend-payext
pwd  # 出力: /home/araki/crypfy/frontend-payext

# Extension生成コマンド:
pnpm shopify app generate extension
```

### アプリ開発時

```bash
# 開発サーバー起動:
cd /home/araki/crypfy/frontend-payext
pnpm shopify app dev
```

---

## 📦 インストール済みパッケージ (frontend-payext/)

### CDP & Blockchain
- `@coinbase/coinbase-sdk@0.25.0` - Server Wallets v2
- `@base-org/account@2.5.0` - Embedded Wallets
- `@coinbase/onchainkit@1.1.2` - UI Components, Onramp
- `@coinbase/wallet-sdk@4.3.7` - Wallet SDK
- `viem@2.39.3` - EVM通信
- `wagmi@2.19.5` - Web3 Hooks

### Database
- `@supabase/supabase-js@2.84.0` - Supabase Client

### Shopify
- `@shopify/app@3.58.2` - Shopify App基盤
- `@shopify/shopify-app-remix@3.6.3` - Remix統合
- その他多数のShopify関連パッケージ

---

## ✅ 生成済みExtensions

### 1. Payment Extension (手動作成) ✅

**重要**: CLIでは生成不可のため手動作成

```bash
cd /home/araki/crypfy/frontend-payext
mkdir -p extensions/crypfy-payment
vim extensions/crypfy-payment/shopify.extension.toml
```

**実際の構成**:
```
frontend-payext/
├── extensions/
│   └── crypfy-payment/
│       └── shopify.extension.toml  # 手動作成 ✅
```

**設定内容（ハッカソン向けOffsite方式）**:
- `type: payments_extension`
- `target: payments.offsite.render` ✅ (Beta access不要)
- `payment_session_url`, `refund_session_url` など6つのエンドポイント定義
- `supported_payment_methods: ["wallet"]` - Crypto/Wallet決済
- `merchant_label`, `buyer_label` - チェックアウト画面表示名
- `supported_countries` - 対応国リスト

**ハッカソン後の移行計画** 🎯:
- Payments Partner承認後、`target: payments.custom-onsite.render` へ変更
- `ui_extension_handle: crypfy-checkout-ui` でCheckout UIと連携（iframe統合）
- その他のAPIエンドポイントは変更不要

### 2. Checkout UI Extension ✅
```bash
cd /home/araki/crypfy/frontend-payext
pnpm shopify app generate extension

# 選択肢:
# Type: Checkout UI Extension
# Name: crypfy-checkout-ui
```

**生成された構成**:
```
frontend-payext/
├── extensions/
│   ├── crypfy-payment/
│   └── crypfy-checkout-ui/  ✅
│       ├── src/
│       │   └── Checkout.jsx
│       ├── locales/
│       │   ├── en.default.json
│       │   └── fr.json
│       └── shopify.extension.toml
```

---

## 📝 実装予定のRoutes

### Payment関連 (app/routes/)

```
app/routes/
├── api.payment_session.tsx        # POST /api/payment_session ✅
├── api.refund_session.tsx         # POST /api/refund_session ✅
├── api.capture_session.tsx        # POST /api/capture_session ✅
├── api.void_session.tsx           # POST /api/void_session ✅
├── api.confirmation_callback.tsx  # POST /api/confirmation_callback ✅
├── api.payment.resolve.tsx        # POST /api/payment/resolve ⏳
└── app.pay.$id.tsx                # GET /app/pay/:id (決済ページ) ⏳
```

---

## 🔑 重要なファイルパス

| ファイル | パス | 用途 |
|---------|------|------|
| **App設定** | `/home/araki/crypfy/frontend-payext/shopify.app.toml` | Shopify App全体設定 |
| **Package定義** | `/home/araki/crypfy/frontend-payext/package.json` | 依存関係管理 |
| **DB Schema** | `/home/araki/crypfy/frontend-payext/prisma/schema.prisma` | データベース構造 |
| **Extension格納** | `/home/araki/crypfy/frontend-payext/extensions/` | Payment/Checkout UI Extensions |
| **Routes** | `/home/araki/crypfy/frontend-payext/app/routes/` | API & ページルート |
| **Shopify Client** | `/home/araki/crypfy/frontend-payext/app/shopify.server.ts` | Shopify API連携 |

---

## 🎨 開発フロー

### 1. Extension生成フェーズ (現在)
```bash
cd /home/araki/crypfy/frontend-payext
pnpm shopify app generate extension  # Payment Extension
pnpm shopify app generate extension  # Checkout UI Extension
```

### 2. 設定フェーズ
```bash
# Payment Extension設定
vim extensions/crypfy-payment/shopify.extension.toml

# Checkout UI Extension設定
vim extensions/crypfy-checkout-ui/shopify.ui.extension.toml
```

### 3. 開発フェーズ
```bash
cd /home/araki/crypfy/frontend-payext
pnpm shopify app dev  # 開発サーバー起動
```

### 4. デプロイフェーズ
```bash
cd /home/araki/crypfy/frontend-payext
pnpm shopify app deploy
```

---

**常にこのファイルを参照して正しいディレクトリで作業してください！**
