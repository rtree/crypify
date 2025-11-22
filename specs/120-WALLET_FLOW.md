# Wallet UIフロー解説（Next.js `/start` エンドポイント）

このドキュメントでは、メールリンククリック後に起動するNext.js Wallet UIのフローを解説します。

---

## 📌 概要

**エンドポイント**: `https://crypfy-wallet-a31f697f-XXXXXXXXXX.us-west1.run.app/start` (GET)  
**目的**: メールのリンクをクリックした顧客に、専用のCrypto Walletを表示する。

**トリガー**: メール内のリンククリック  
**URL例**: `https://crypfy-wallet-a31f697f-[HASH].us-west1.run.app/start?token=xxx`  
**認証**: JWT token検証 → Passkey（Face ID / Touch ID）（Phase 2）  
**技術**: Next.js 15 + @base-org/account + @coinbase/onchainkit（Phase 2以降）

> **Note**: Cloud RunのデプロイURLは `https://[SERVICE_NAME]-[HASH].us-west1.run.app` 形式になります。実際のURLはデプロイ後に確認してください。

---

## 🔄 処理フロー全体像

```text
┌─────────────────────────────────────────────────────────────┐
│  1. 顧客がメール内のリンクをクリック                        │
│     https://crypfy-wallet-a31f697f-xxx.us-west1.run.app/start?token=xxx │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  2. Next.js アプリケーションが起動                          │
│     /app/start/page.tsx                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  3. Phase別処理分岐                                         │
│                                                             │
│  【Phase 1】 (現在 - 空実装)                                │
│    - 「Wallet起動しました」ダミー画面表示                  │
│    - デプロイ確認が目的                                     │
│                                                             │
│  【Phase 2】 (CDP統合)                                      │
│    - JWT token検証                                          │
│    - CDP Embedded Wallet接続                                │
│    - Passkey認証（Face ID / Touch ID）                      │
│    - USDC残高表示                                           │
│    - トランザクション履歴表示                               │
│                                                             │
│  【Phase 3】 (強化)                                         │
│    - エラー処理強化                                         │
│    - ロード演出・アニメーション                             │
│    - リトライ機能                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Phase 1: 空実装（現在）

### 目的

- Next.js アプリケーションの基本構造確認
- Cloud Run / Vercel デプロイ確認
- メールリンク → Wallet UI 遷移確認

### ファイル構造

```text
/wallet-ui/
├── app/
│   ├── start/
│   │   └── page.tsx          # メールリンクの着地ページ
│   ├── layout.tsx
│   └── globals.css
├── package.json
└── next.config.js
```

### 実装例: `/app/start/page.tsx`

```typescript
export default function StartPage() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <h1>🎉 Wallet起動しました</h1>
    </div>
  );
}
```

### デプロイ確認

```bash
# Cloud Run デプロイ後
curl https://crypfy-wallet-a31f697f-[HASH].us-west1.run.app/start?token=dummy
# → "🎉 Wallet起動しました" が表示されればOK
```

---

## 🔧 Phase 2: CDP統合

### 1. 必要パッケージ

```bash
npm install @base-org/account @coinbase/onchainkit @tanstack/react-query
```

### 2. JWT Token検証

#### ファイル: `/app/lib/auth.ts`

```typescript
import jwt from 'jsonwebtoken';

export interface TokenPayload {
  orderId: string;
  email: string;
  walletAddress: string;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    return decoded;
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    return null;
  }
}
```

### 3. Embedded Wallet接続

#### ファイル: `/app/start/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { EmbeddedWallet } from '@base-org/account';
import { verifyToken } from '../lib/auth';

export default function StartPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const [wallet, setWallet] = useState<EmbeddedWallet | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initWallet() {
      if (!searchParams.token) {
        setError('トークンが見つかりません');
        return;
      }

      // 1. JWT検証
      const payload = verifyToken(searchParams.token);
      if (!payload) {
        setError('無効なトークンです');
        return;
      }

      // 2. Embedded Wallet初期化
      const embeddedWallet = new EmbeddedWallet({
        apiKey: process.env.NEXT_PUBLIC_CDP_API_KEY!,
        network: 'base-sepolia',
      });

      try {
        // 3. Passkey認証
        await embeddedWallet.authenticate({
          email: payload.email,
          passkey: true, // Face ID / Touch ID
        });

        setWallet(embeddedWallet);
        setAddress(await embeddedWallet.getAddress());
      } catch (err) {
        setError('認証に失敗しました: ' + String(err));
      }
    }

    initWallet();
  }, [searchParams.token]);

  if (error) {
    return <div style={{ color: 'red' }}>{error}</div>;
  }

  if (!wallet || !address) {
    return <div>🔄 Wallet読み込み中...</div>;
  }

  return (
    <div>
      <h1>🎉 あなた専用のCrypto Wallet</h1>
      <p>Address: {address}</p>
      {/* Phase 2: OnchainKitコンポーネント追加 */}
    </div>
  );
}
```

### 4. USDC残高表示（OnchainKit）

#### ファイル: `/app/start/page.tsx` (追加部分)

```typescript
import { Balance, Transactions } from '@coinbase/onchainkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function StartPage({ searchParams }: { searchParams: { token?: string } }) {
  // ... 上記のコード ...

  return (
    <QueryClientProvider client={queryClient}>
      <div style={{ padding: '20px' }}>
        <h1>🎉 あなた専用のCrypto Wallet</h1>
        
        {/* USDC残高 */}
        <section>
          <h2>💰 USDC残高</h2>
          <Balance
            address={address}
            chain="baseSepolia"
            token="USDC"
          />
        </section>

        {/* トランザクション履歴 */}
        <section>
          <h2>📜 履歴</h2>
          <Transactions
            address={address}
            chain="baseSepolia"
          />
        </section>

        {/* Wallet Address */}
        <section>
          <h2>🏦 Walletアドレス</h2>
          <code style={{ fontSize: '12px' }}>{address}</code>
        </section>
      </div>
    </QueryClientProvider>
  );
}
```

---

## 🔐 Phase 3: セキュリティ強化

### 1. エラー処理

```typescript
// Token検証エラー
if (!payload) {
  return (
    <div style={{ padding: '20px', color: 'red' }}>
      <h1>⚠️ 無効なリンクです</h1>
      <p>メールに記載されたリンクをもう一度確認してください。</p>
    </div>
  );
}

// Passkey認証エラー
try {
  await embeddedWallet.authenticate({ email, passkey: true });
} catch (err) {
  return (
    <div style={{ padding: '20px', color: 'orange' }}>
      <h1>🔑 認証が必要です</h1>
      <p>Face ID / Touch IDで認証してください。</p>
      <button onClick={() => retryAuth()}>再試行</button>
    </div>
  );
}
```

### 2. ロード演出

```typescript
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function initWallet() {
    setLoading(true);
    try {
      // ... Wallet初期化 ...
    } finally {
      setLoading(false);
    }
  }
  initWallet();
}, []);

if (loading) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div>
        <h2>🔄 Walletを準備中...</h2>
        <p style={{ color: '#666' }}>Face ID / Touch IDで認証してください</p>
      </div>
    </div>
  );
}
```

### 3. Token有効期限チェック

```typescript
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
    
    // 有効期限チェック（JWTが自動的に行うが明示的に確認）
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      console.warn('[Auth] Token expired');
      return null;
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.error('[Auth] Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.error('[Auth] Invalid token');
    }
    return null;
  }
}
```

---

## 🧪 動作確認

### Phase 1

1. **Cloud Run / Vercel デプロイ**

   ```bash
   # GitHub Actions経由でデプロイ済み
   # または手動デプロイ
   gcloud run deploy crypfy-wallet-a31f697f \
     --image gcr.io/ethglobal-479011/crypfy-wallet-a31f697f \
     --platform managed \
     --region us-west1
   ```

2. **ブラウザで確認**

   ```bash
   # 実際のURLを確認
   gcloud run services describe crypfy-wallet-a31f697f --region us-west1 --format='value(status.url)'
   
   # そのURLでアクセステスト
   curl https://crypfy-wallet-a31f697f-[HASH].us-west1.run.app/start?token=dummy
   # → "🎉 Wallet起動しました" が表示されればOK
   ```

### Phase 2

1. **Bogus Gateway購入**

   ```bash
   # Dev Storeで購入 → Webhookトリガー → メール送信
   ```

2. **メールリンククリック**

   ```bash
   # メール本文のリンク（JWT token付き）をクリック
   # → Passkey認証（Face ID / Touch ID）
   # → Wallet UI表示
   ```

3. **USDC残高確認**

   ```bash
   # OnchainKitのBalanceコンポーネントで残高表示
   # → 購入額の10%がUSDCで表示されているか確認
   ```

4. **BaseScan確認**

   ```bash
   # トランザクションhashをBaseScanで検索
   # https://sepolia.basescan.org/tx/<txHash>
   ```

---

## 🚨 トラブルシューティング

### Issue 1: Passkey認証が失敗する

**原因**:

- ブラウザがPasskey未対応
- HTTPSでない（localhost以外）
- 初回認証時にPasskey登録が必要

**解決策**:

```typescript
// Fallback: Email OTP認証
await embeddedWallet.authenticate({
  email: payload.email,
  passkey: false, // OTPにフォールバック
});
```

### Issue 2: USDC残高が0と表示される

**原因**:

- トランザクションが未確認
- 間違ったChain指定

**解決策**:

```typescript
// 1. トランザクション確認待ち
const transfer = await wallet.createTransfer({ ... });
await transfer.wait(); // confirmまで待機

// 2. Chain指定確認
<Balance chain="baseSepolia" /> // ← base-sepoliaではなくbaseSepolia
```

### Issue 3: JWT tokenが無効

**原因**:

- JWT_SECRETがRemixとNext.jsで異なる
- Token有効期限切れ

**解決策**:

```bash
# GCP Secret Managerで同じJWT_SECRETを使用
gcloud secrets versions access latest --secret="JWT_SECRET"

# 両方の環境変数に同じ値をセット
# Remix: Cloud Runの環境変数
# Next.js: Vercelの環境変数 or Cloud Runの環境変数
```

---

## 📋 チェックリスト

### Phase 1（空実装）

- [ ] Next.js 15プロジェクト作成
- [ ] `/app/start/page.tsx` でダミー画面表示
- [ ] Cloud Run or Vercel デプロイ
- [ ] Cloud Run URLでアクセス確認（`gcloud run services describe`で確認）

### Phase 2（CDP統合）

- [ ] `@base-org/account` インストール
- [ ] `@coinbase/onchainkit` インストール
- [ ] JWT token検証実装 (`/app/lib/auth.ts`)
- [ ] Embedded Wallet接続実装
- [ ] Passkey認証実装
- [ ] USDC残高表示（OnchainKit `<Balance>`）
- [ ] トランザクション履歴表示（OnchainKit `<Transactions>`）
- [ ] E2E flow test（購入 → メール → Wallet UI）

### Phase 3（強化）

- [ ] Token有効期限エラー処理
- [ ] Passkey失敗時のfallback（OTP）
- [ ] ロード演出・アニメーション
- [ ] リトライボタン
- [ ] エラー画面デザイン

---

## 📚 参考リンク

- **Embedded Wallets**: [https://docs.base.org/embedded-wallets](https://docs.base.org/embedded-wallets)
- **OnchainKit Docs**: [https://onchainkit.xyz/](https://onchainkit.xyz/)
- **Passkey Authentication**: [https://webauthn.guide/](https://webauthn.guide/)
- **BaseScan (Sepolia)**: [https://sepolia.basescan.org/](https://sepolia.basescan.org/)
