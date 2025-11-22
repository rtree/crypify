# Crypify API Service (Cloud Run)

## サービス概要

Express.js ベースの RESTful API サービス。商品購入から暗号資産決済、ウォレット管理までを処理します。

**デプロイ先**: Google Cloud Run (`crypify-api`)  
**リージョン**: asia-northeast1 (東京)  
**言語**: TypeScript (Node.js 20)  
**フレームワーク**: Express 4.21.2

## アーキテクチャ

```
┌─────────────────────────────────────────────┐
│         Crypify API (Cloud Run)             │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────┐    ┌──────────────────┐   │
│  │  Express    │───▶│  Route Handlers  │   │
│  │  Server     │    └──────────────────┘   │
│  └─────────────┘            │              │
│                              ▼              │
│       ┌──────────────────────────────┐     │
│       │   Business Logic Layer       │     │
│       ├──────────────────────────────┤     │
│       │  • Purchase Management       │     │
│       │  • Payment Processing        │     │
│       │  • Wallet Operations         │     │
│       └──────────────────────────────┘     │
│                    │                        │
│                    ▼                        │
│       ┌──────────────────────────────┐     │
│       │    Service Layer             │     │
│       ├──────────────────────────────┤     │
│       │  • CDP Integration           │     │
│       │  • Email Delivery            │     │
│       │  • Data Storage              │     │
│       └──────────────────────────────┘     │
│                                             │
└─────────────────────────────────────────────┘
         │           │            │
         ▼           ▼            ▼
   ┌─────────┐  ┌────────┐  ┌──────────┐
   │ CDP API │  │SendGrid│  │In-Memory │
   │(Base    │  │        │  │ Storage  │
   │Sepolia) │  │        │  │          │
   └─────────┘  └────────┘  └──────────┘
```

## エンドポイント一覧

| Method | Path | 説明 |
|--------|------|------|
| GET | `/` | ヘルスチェック |
| POST | `/purchase` | 購入レコード作成 |
| POST | `/pay` | 決済実行（ウォレット作成・送金・メール送信） |
| GET | `/wallet` | ウォレット情報取得 |

## 処理フロー詳細

### 1. POST /purchase - 購入レコード作成

**目的**: 商品の在庫確認と購入IDの発行

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant InMemory

    Client->>API: POST /purchase<br/>{sku, qty, email}
    
    API->>API: Validate request
    alt Invalid input
        API-->>Client: 400 Bad Request
    end
    
    API->>InMemory: Check SKU exists
    alt Invalid SKU
        API-->>Client: 400 "Invalid SKU"
    end
    
    API->>InMemory: Check inventory >= qty
    alt Insufficient inventory
        API-->>Client: 400 "Insufficient inventory"
    end
    
    API->>API: Generate purchaseId<br/>PUR-{timestamp}-{random}
    API->>API: Calculate totalUSD<br/>= price[sku] * qty
    
    API->>InMemory: Store purchase record<br/>{id, sku, qty, email, totalUSD, paid:false}
    API->>InMemory: Decrease inventory[sku] -= qty
    
    API-->>Client: 200 OK<br/>{purchaseId, sku, qty, totalUSD}
```

**リクエスト例**:
```json
POST /purchase
{
  "sku": "hoodie",
  "qty": 2,
  "email": "user@example.com"
}
```

**レスポンス例**:
```json
{
  "purchaseId": "PUR-1732234567890-abc123",
  "sku": "hoodie",
  "qty": 2,
  "totalUSD": 100.00
}
```

**処理時間**: ~10ms (in-memory操作のみ)

**実装ファイル**: `api/src/routes/purchase.ts`

**データ構造**:
```typescript
// In-Memory Storage
const purchases = new Map<string, Purchase>();
const inventory = new Map<string, number>([
  ['hoodie', 100],
  ['tshirt', 200],
  ['cap', 150]
]);
const prices = new Map<string, number>([
  ['hoodie', 50],
  ['tshirt', 25],
  ['cap', 15]
]);

interface Purchase {
  id: string;
  sku: string;
  qty: number;
  email: string;
  totalUSD: number;
  paid: boolean;
  createdAt: number;
}
```

### 2. POST /pay - 決済実行

**目的**: CDP統合による暗号資産決済とウォレット作成

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant CDP
    participant Blockchain
    participant SendGrid
    participant InMemory

    Client->>API: POST /pay<br/>{purchaseId, email}
    
    API->>InMemory: Get purchase record
    alt Purchase not found
        API-->>Client: 404 "Purchase not found"
    end
    
    API->>API: Validate email matches
    alt Email mismatch
        API-->>Client: 403 "Email mismatch"
    end
    
    alt Already paid
        API-->>Client: 400 "Already paid"
    end
    
    Note over API,CDP: Step 1: Create User Wallet
    API->>CDP: createWallet({networkId: "base-sepolia"})
    CDP->>Blockchain: Deploy smart contract wallet
    Blockchain-->>CDP: Wallet address
    CDP-->>API: {walletId, address, seed}
    
    Note over API,CDP: Step 2: Send USDC Payment
    API->>CDP: masterWallet.transfer({<br/>  amount: totalUSD,<br/>  asset: "USDC",<br/>  destination: userAddress<br/>})
    CDP->>Blockchain: Transfer USDC
    Blockchain-->>CDP: Transaction hash
    CDP-->>API: txHash
    
    Note over API,CDP: Step 3: Send 10% Reward (Gasless)
    API->>CDP: transfer({<br/>  amount: totalUSD * 0.1,<br/>  asset: "USDC",<br/>  destination: userAddress,<br/>  gasless: true<br/>})
    CDP->>Blockchain: Gasless transfer
    Blockchain-->>CDP: Reward tx hash
    CDP-->>API: rewardTxHash
    
    Note over API,SendGrid: Step 4: Send Email
    API->>API: Generate walletLinkToken
    API->>SendGrid: send({<br/>  to: email,<br/>  subject: "Payment Confirmed",<br/>  html: emailTemplate<br/>})
    SendGrid-->>API: Email sent
    
    Note over API,InMemory: Step 5: Update Records
    API->>InMemory: Update purchase.paid = true
    API->>InMemory: Store wallet data
    API->>InMemory: Map email ↔ token
    
    API-->>Client: 200 OK<br/>{txHash, rewardTxHash, walletLinkToken}
```

**リクエスト例**:
```json
POST /pay
{
  "purchaseId": "PUR-1732234567890-abc123",
  "email": "user@example.com"
}
```

**レスポンス例**:
```json
{
  "success": true,
  "txHash": "0x1234567890abcdef...",
  "rewardTxHash": "0xfedcba0987654321...",
  "walletLinkToken": "abc123def456...",
  "message": "Payment successful! Check your email."
}
```

**処理時間**: ~3-5秒
- ウォレット作成: ~1s
- USDC送金: ~2s
- 報酬送金: ~1s
- メール送信: ~0.5s

**実装ファイル**: 
- `api/src/routes/pay.ts`
- `api/src/services/cdp.ts`
- `api/src/services/email.ts`

**CDP統合詳細**:

```typescript
// 1. ウォレット作成 (Server-Signer Model)
const wallet = await Coinbase.createWallet({
  networkId: "base-sepolia"
});
const address = await wallet.getDefaultAddress();
const seed = wallet.exportSeed(); // 安全に保存が必要

// 2. USDC送金（マスターウォレットから）
const transfer = await masterWallet.createTransfer({
  amount: totalUSD,
  assetId: "USDC",
  destination: userWalletAddress,
  networkId: "base-sepolia"
});
await transfer.wait();
const txHash = transfer.getTransactionHash();

// 3. ガスレス報酬送付
const rewardTransfer = await Coinbase.createTransfer({
  amount: totalUSD * 0.1,
  assetId: "USDC",
  destination: userWalletAddress,
  networkId: "base-sepolia",
  gasless: true  // CDP がガス代をスポンサー
});
await rewardTransfer.wait();
const rewardTxHash = rewardTransfer.getTransactionHash();
```

**SendGrid統合**:

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
  from: process.env.FROM_EMAIL,
  to: email,
  subject: `✅ Payment Confirmed - ${purchaseId}`,
  html: emailTemplate,
  text: emailTextVersion
});
```

メール内容:
- 購入詳細（SKU, 数量, 金額）
- トランザクションリンク（Basescan）
- 報酬トランザクションリンク
- ウォレットアクセスリンク

**データ構造**:
```typescript
interface WalletData {
  email: string;
  address: string;
  walletId: string;
  seed: string;  // ⚠️ 暗号化して保存すべき
  createdAt: number;
  rewardHistory: Array<{
    txHash: string;
    amount: string;
    timestamp: number;
  }>;
}

// In-Memory Storage
const wallets = new Map<string, WalletData>();
const emailToToken = new Map<string, string>();
const tokenToEmail = new Map<string, string>();
```

### 3. GET /wallet - ウォレット情報取得

**目的**: トークンベース認証でウォレット残高と報酬履歴を取得

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant InMemory

    Client->>API: GET /wallet?token=xxx
    
    API->>API: Validate token parameter
    alt Missing token
        API-->>Client: 400 "Missing token"
    end
    
    API->>InMemory: tokenToEmail.get(token)
    alt Invalid token
        API-->>Client: 404 "Invalid token"
    end
    
    API->>InMemory: wallets.get(email)
    alt Wallet not found
        API-->>Client: 404 "Wallet not found"
    end
    
    API->>API: Calculate balance<br/>= sum(rewardHistory.amount)
    
    API-->>Client: 200 OK<br/>{email, address, balance, rewardHistory}
```

**リクエスト例**:
```
GET /wallet?token=abc123def456...
```

**レスポンス例**:
```json
{
  "email": "user@example.com",
  "address": "0x1234...5678",
  "balance": "15.50",
  "rewardHistory": [
    {
      "txHash": "0xfedcba...",
      "amount": "5.00",
      "timestamp": 1732234567890
    }
  ]
}
```

**処理時間**: ~10ms (in-memory操作のみ)

**実装ファイル**: `api/src/routes/wallet.ts`

## 環境変数

### 必須環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `CDP_API_KEY` | Coinbase Developer Platform API Key | `organizations/xxx/apiKeys/yyy` |
| `CDP_API_SECRET` | CDP API Secret | `-----BEGIN EC PRIVATE KEY-----\n...` |
| `SENDGRID_API_KEY` | SendGrid API Key | `SG.xxxxx.yyyyy` |
| `FROM_EMAIL` | 送信元メールアドレス（SendGrid検証済み） | `noreply@crypify.app` |
| `FRONTEND_URL` | Web アプリケーション URL | `https://crypify-web-xxx.a.run.app` |

### オプション環境変数

| 変数名 | デフォルト | 説明 |
|--------|-----------|------|
| `NODE_ENV` | `development` | 実行環境 |
| `PORT` | `8080` | サーバーポート |

## データストレージ

### 現在の実装（開発用）

```typescript
// In-Memory Storage (Map)
const purchases = new Map<string, Purchase>();
const wallets = new Map<string, WalletData>();
const inventory = new Map<string, number>();
const prices = new Map<string, number>();
const emailToToken = new Map<string, string>();
const tokenToEmail = new Map<string, string>();
```

**問題点**:
- サーバー再起動でデータ消失
- 複数インスタンス間で共有不可
- スケールアウト不可

### 本番環境への推奨実装

```typescript
// PostgreSQL / Cloud SQL
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Redis (セッション・キャッシュ)
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL
});
```

**テーブル設計**:
```sql
-- 購入レコード
CREATE TABLE purchases (
  id VARCHAR(64) PRIMARY KEY,
  sku VARCHAR(32) NOT NULL,
  qty INTEGER NOT NULL,
  email VARCHAR(255) NOT NULL,
  total_usd DECIMAL(10,2) NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ウォレット
CREATE TABLE wallets (
  email VARCHAR(255) PRIMARY KEY,
  address VARCHAR(42) NOT NULL UNIQUE,
  wallet_id VARCHAR(255) NOT NULL,
  encrypted_seed TEXT NOT NULL,  -- 暗号化必須
  created_at TIMESTAMP DEFAULT NOW()
);

-- 報酬履歴
CREATE TABLE rewards (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) REFERENCES wallets(email),
  tx_hash VARCHAR(66) NOT NULL UNIQUE,
  amount DECIMAL(18,6) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  INDEX idx_email_timestamp (email, timestamp DESC)
);

-- アクセストークン（Redis推奨）
-- Key: wallet:token:{token}
-- Value: {email}
-- TTL: 604800 (7日間)
```

## エラーハンドリング

### エラーレスポンス形式

```typescript
interface ErrorResponse {
  error: string;
  details?: string;  // 開発環境のみ
}
```

### HTTPステータスコード

| コード | 用途 | 例 |
|--------|------|-----|
| 200 | 成功 | 正常な処理完了 |
| 400 | バッドリクエスト | バリデーションエラー、既に支払い済み |
| 403 | 禁止 | メールアドレス不一致 |
| 404 | 未検出 | 購入ID未存在、トークン無効 |
| 500 | サーバーエラー | CDP API エラー、DB接続エラー |

### ログ出力

```typescript
// 正常処理
console.log(`✅ Purchase created: ${purchaseId}`);
console.log(`💸 Payment processed: ${txHash}`);
console.log(`📧 Email sent to ${email}`);

// エラー
console.error(`❌ CDP error:`, error);
console.error(`❌ SendGrid error:`, error);
```

## セキュリティ

### 実装済み

- ✅ リクエストバリデーション
- ✅ メール所有権確認（email match）
- ✅ 二重支払い防止（paid フラグ）
- ✅ CORS 設定
- ✅ Secret Manager による機密情報管理

### TODO

- [ ] レート制限（同一IPからの連続リクエスト）
- [ ] ウォレットシードの暗号化
- [ ] トークンの有効期限
- [ ] 監査ログ
- [ ] 不正検知

## パフォーマンス

### 現在の性能

| エンドポイント | 平均応答時間 | 備考 |
|---------------|-------------|------|
| GET / | <10ms | ヘルスチェック |
| POST /purchase | ~10ms | In-memory操作のみ |
| POST /pay | 3-5秒 | CDP API呼び出し含む |
| GET /wallet | ~10ms | In-memory操作のみ |

### スケーリング設定

```yaml
# Cloud Run設定
minInstances: 0      # アイドル時はインスタンス0
maxInstances: 10     # 最大10インスタンス
cpu: 1               # 1 vCPU
memory: 512Mi        # 512MB RAM
concurrency: 80      # 1インスタンスあたり80並行リクエスト
timeout: 60s         # タイムアウト60秒
```

### ボトルネック

1. **CDP API呼び出し**
   - ウォレット作成: ~1秒
   - トランザクション送信: ~2秒
   - 対策: 非同期処理、Webhook活用

2. **In-Memory Storage**
   - スケールアウト不可
   - 対策: DB + Redis導入

3. **SendGrid API**
   - メール送信: ~0.5秒
   - 対策: バックグラウンドジョブ化

## モニタリング

### 推奨メトリクス

```bash
# リクエスト数
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_count"'

# レイテンシ
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_latencies"'

# エラー率
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_count" AND metric.label.response_code_class="5xx"'
```

### ログ確認

```bash
# リアルタイムログ
gcloud run services logs tail crypify-api --region=asia-northeast1

# エラーログのみ
gcloud run services logs read crypify-api \
  --region=asia-northeast1 \
  --filter="severity>=ERROR"
```

## デプロイ

### GitHub Actions による自動デプロイ

トリガー:
- `api/**` の変更を含む `main` ブランチへの push
- 手動実行 (`workflow_dispatch`)

処理フロー:
1. Docker イメージビルド
2. Artifact Registry へプッシュ
3. Cloud Run へデプロイ
4. Secret Manager からシークレット注入

### ローカルテスト

```bash
# ローカルでDockerビルド
docker build -f api/Dockerfile -t crypify-api-test .

# ローカルで実行
docker run -p 8080:8080 \
  -e CDP_API_KEY=xxx \
  -e CDP_API_SECRET=yyy \
  -e SENDGRID_API_KEY=zzz \
  -e FROM_EMAIL=test@example.com \
  -e FRONTEND_URL=http://localhost:3000 \
  crypify-api-test
```

## TODO

### 優先度: 高

- [ ] データベース永続化（PostgreSQL + Redis）
- [ ] CDP実装（現在はモック）
- [ ] マスターウォレットの作成と資金供給
- [ ] エラーリトライロジック

### 優先度: 中

- [ ] Webhook による支払い確認
- [ ] トランザクションタイムアウト処理
- [ ] レート制限実装
- [ ] キャッシング戦略

### 優先度: 低

- [ ] 監査ログ
- [ ] メトリクス収集
- [ ] A/Bテスト基盤
- [ ] 管理画面
