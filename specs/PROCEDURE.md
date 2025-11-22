# CI/CD Setup Procedure

このドキュメントでは、GitHub ActionsからCloud Runへの自動デプロイに必要なシークレット・認証情報の発行手順を説明します。

---

## 目次

1. [GCP設定](#1-gcp設定)
2. [GitHub Secrets設定](#2-github-secrets設定)
3. [GCP Secret Manager設定](#3-gcp-secret-manager設定)
4. [Shopify認証情報取得](#4-shopify認証情報取得)
5. [CDP認証情報取得](#5-cdp認証情報取得)
6. [JWT_SECRET生成](#6-jwt_secret生成)
7. [デプロイテスト](#7-デプロイテスト)

---

## 1. GCP設定

### 1.1 プロジェクト作成・確認

```bash
# 新規プロジェクト作成（必要な場合）
gcloud projects create crypify-prod --name="Crypify Production"

# プロジェクトID確認
gcloud projects list

# プロジェクト設定
gcloud config set project <YOUR_PROJECT_ID>
```

**取得する値**: `GCP_PROJECT_ID` (例: `crypify-prod`)

---

### 1.2 必要なAPIの有効化

```bash
# Cloud Run API
gcloud services enable run.googleapis.com

# Container Registry API
gcloud services enable containerregistry.googleapis.com

# Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Cloud Build API (optional, but recommended)
gcloud services enable cloudbuild.googleapis.com
```

---

### 1.3 サービスアカウント作成

```bash
# サービスアカウント作成
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deployment"

# サービスアカウントのメールアドレス確認
SA_EMAIL=$(gcloud iam service-accounts list \
  --filter="displayName:GitHub Actions Deployment" \
  --format="value(email)")

echo $SA_EMAIL
# 出力例: github-actions@crypify-prod.iam.gserviceaccount.com
# deployment-buenos-2025@ethglobal-479011.iam.gserviceaccount.com
```

---

### 1.4 サービスアカウントに権限付与

```bash
# Cloud Run管理者権限
gcloud projects add-iam-policy-binding ethglobal-479011 \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/run.admin"

# Storage管理者権限（Container Registry用）
gcloud projects add-iam-policy-binding ethglobal-479011 \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/storage.admin"

# Secret Managerアクセス権限
gcloud projects add-iam-policy-binding ethglobal-479011 \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

# サービスアカウントユーザー権限（Cloud Runデプロイ時に必要）
gcloud projects add-iam-policy-binding ethglobal-479011 \
  --member="serviceAccount:$SA_EMAIL" \
  --role="roles/iam.serviceAccountUser"
```

---

### 1.5 サービスアカウントキー発行

```bash
# JSONキー発行（GitHub Secretsに登録するため）
gcloud iam service-accounts keys create ~/github-actions-key.json \
  --iam-account=$SA_EMAIL

# キーの内容を確認（コピー用）
cat ~/github-actions-key.json
```

**取得する値**: `GCP_SA_KEY` (JSONファイル全体の内容)

**⚠️ セキュリティ注意**:
- このJSONファイルは強力な権限を持つため、外部に漏らさない
- GitHub Secretsに登録後、ローカルファイルは削除推奨: `rm ~/github-actions-key.json`

---

## 2. GitHub Secrets設定

### 2.1 リポジトリのSecrets設定画面へ移動

1. GitHubリポジトリ: `https://github.com/rtree/crypify`
2. `Settings` タブ
3. 左メニュー: `Secrets and variables` → `Actions`
4. `New repository secret` ボタン

---

### 2.2 シークレット登録

以下の2つを登録:

| Name | Value | 説明 |
|------|-------|------|
| `GCP_PROJECT_ID` | `crypify-prod` など | GCPプロジェクトID |
| `GCP_SA_KEY` | `{"type": "service_account", ...}` | サービスアカウントのJSON全体 |

**登録手順**:
1. `Name`: `GCP_PROJECT_ID`
2. `Secret`: プロジェクトID（例: `crypify-prod`）
3. `Add secret`
4. 同様に `GCP_SA_KEY` も登録（JSONファイルの中身をそのままペースト）

---

## 3. GCP Secret Manager設定

Cloud Runコンテナ内で使用するシークレットをGCP Secret Managerに保存します。

### 3.1 Shopify認証情報

```bash
# SHOPIFY_API_KEY
echo -n "YOUR_SHOPIFY_API_KEY_HERE" | \
  gcloud secrets create SHOPIFY_API_KEY \
  --data-file=- \
  --replication-policy="automatic"

# SHOPIFY_API_SECRET
echo -n "YOUR_SHOPIFY_API_SECRET_HERE" | \
  gcloud secrets create SHOPIFY_API_SECRET \
  --data-file=- \
  --replication-policy="automatic"
```

---

### 3.2 CDP認証情報

```bash
# CDP_API_KEY
echo -n "YOUR_CDP_API_KEY_HERE" | \
  gcloud secrets create CDP_API_KEY \
  --data-file=- \
  --replication-policy="automatic"

# CDP_API_SECRET
echo -n "YOUR_CDP_API_SECRET_HERE" | \
  gcloud secrets create CDP_API_SECRET \
  --data-file=- \
  --replication-policy="automatic"
```

---

### 3.3 JWT_SECRET

```bash
# JWT_SECRET（ランダム生成して登録）
openssl rand -base64 32 | \
  gcloud secrets create JWT_SECRET \
  --data-file=- \
  --replication-policy="automatic"
```

---

### 3.4 シークレット一覧確認

```bash
gcloud secrets list
```

以下が表示されればOK:
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `CDP_API_KEY`
- `CDP_API_SECRET`
- `JWT_SECRET`

---

## 4. Shopify認証情報取得

### 4.1 SHOPIFY_API_KEY

**取得方法**:
1. Shopify Partners Dashboard: `https://partners.shopify.com/`
2. `Apps` → 既存のアプリを選択（または新規作成）
3. `App setup` タブ
4. `Client ID` をコピー → これが `SHOPIFY_API_KEY`

**または**:
```bash
# frontend-payext/shopify.app.toml から確認
cat /home/araki/crypify/frontend-payext/shopify.app.toml | grep client_id
```

**例**:
```
client_id = "a1b2c3d4e5f6g7h8"
```

---

### 4.2 SHOPIFY_API_SECRET

**取得方法**:
1. 同じアプリ設定画面
2. `Client secret` セクション
3. `Show` ボタンをクリックしてシークレットを表示
4. コピー → これが `SHOPIFY_API_SECRET`

**⚠️ 注意**:
- API Secretは一度しか表示されない場合があります
- 紛失した場合は再生成が必要です

---

### 4.3 開発環境の値を使う場合

```bash
# .envファイルから確認
cat /home/araki/crypify/frontend-payext/.env | grep SHOPIFY_API
```

**出力例**:
```
SHOPIFY_API_KEY=a1b2c3d4e5f6g7h8
SHOPIFY_API_SECRET=shpss_1234567890abcdef
```

---

## 5. CDP認証情報取得

### 5.1 Coinbase Developer Platform アカウント作成

1. CDP Portal: `https://portal.cdp.coinbase.com/`
2. サインアップ/ログイン
3. 新規プロジェクト作成（または既存プロジェクト選択）

---

### 5.2 API Key作成

1. プロジェクトダッシュボード
2. `API Keys` セクション
3. `Create API Key` ボタン
4. Key名を入力（例: `crypify-production`）
5. 権限選択:
   - ✅ `wallet:read`
   - ✅ `wallet:create`
   - ✅ `wallet:update`
   - ✅ `address:create`
   - ✅ `transfer:create`
6. `Create`

---

### 5.3 認証情報保存

作成後、以下が表示されます:

| フィールド | 保存先 | 説明 |
|-----------|-------|------|
| `API Key Name` | - | 識別用（メモ） |
| `API Key ID` | `CDP_API_KEY` | 公開キー |
| `API Secret` | `CDP_API_SECRET` | 秘密鍵（⚠️一度しか表示されない） |

**⚠️ 重要**:
- `API Secret` は画面を閉じると二度と表示されません
- 必ず安全な場所にコピーしてください
- 紛失した場合は新しいキーを作成する必要があります

---

### 5.4 Network設定確認

開発環境では **Base Sepolia (testnet)** を使用:
- Network ID: `base-sepolia`
- Chain ID: `84532`

本番環境では **Base Mainnet**:
- Network ID: `base`
- Chain ID: `8453`

**SDK初期化時の設定**:
```typescript
import { Coinbase } from '@coinbase/coinbase-sdk';

const coinbase = new Coinbase({
  apiKeyName: process.env.CDP_API_KEY,
  privateKey: process.env.CDP_API_SECRET,
  networkId: 'base-sepolia', // or 'base' for mainnet
});
```

---

## 6. JWT_SECRET生成

### 6.1 ランダム文字列生成

```bash
# OpenSSLを使用（推奨）
openssl rand -base64 32
```

**出力例**:
```
K8vN2pQ5mR7tY9uX3wZ6aC1bE4fH0gJ8
```

---

### 6.2 別の方法（Node.js）

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

### 6.3 用途

- Webhook HMAC検証
- セッショントークン署名
- API認証トークン生成

**セキュリティ要件**:
- 最低32文字以上
- ランダム生成（辞書攻撃対策）
- 環境ごとに異なる値を使用（dev/prod分離）

---

## 7. デプロイテスト

### 7.1 手動デプロイテスト

```bash
# ローカルでDockerビルドテスト
cd /home/araki/crypify/frontend-payext
docker build -t test-image .

# GCRにプッシュテスト（GCP認証後）
gcloud auth configure-docker gcr.io
docker tag test-image gcr.io/<YOUR_PROJECT_ID>/crypify-webhook:test
docker push gcr.io/<YOUR_PROJECT_ID>/crypify-webhook:test

# Cloud Runデプロイテスト
gcloud run deploy crypify-webhook-test \
  --image gcr.io/<YOUR_PROJECT_ID>/crypify-webhook:test \
  --region us-west1 \
  --platform managed \
  --allow-unauthenticated
```

---

### 7.2 GitHub Actionsテスト

```bash
# mainブランチにpush
git add .
git commit -m "test: CI/CD pipeline"
git push origin main

# GitHub Actionsの実行確認
# https://github.com/rtree/crypify/actions
```

**確認項目**:
- ✅ Dockerビルド成功
- ✅ GCRプッシュ成功
- ✅ Cloud Runデプロイ成功
- ✅ サービスURL取得成功

---

### 7.3 デプロイ後の動作確認

```bash
# Cloud RunサービスURL取得
gcloud run services describe crypify-webhook \
  --region us-west1 \
  --format="value(status.url)"

# ヘルスチェック（エンドポイントが実装されている場合）
curl https://crypify-webhook-xxxxx.run.app/health
```

---

## チェックリスト

### GCP設定
- [ ] プロジェクト作成・確認
- [ ] 必要なAPI有効化（Cloud Run, Container Registry, Secret Manager）
- [ ] サービスアカウント作成
- [ ] サービスアカウント権限付与（4つの権限）
- [ ] サービスアカウントキー発行

### GitHub Secrets
- [ ] `GCP_PROJECT_ID` 登録
- [ ] `GCP_SA_KEY` 登録

### GCP Secret Manager
- [ ] `SHOPIFY_API_KEY` 登録
- [ ] `SHOPIFY_API_SECRET` 登録
- [ ] `CDP_API_KEY` 登録
- [ ] `CDP_API_SECRET` 登録
- [ ] `JWT_SECRET` 登録

### 認証情報取得
- [ ] Shopify API Key/Secret取得
- [ ] CDP API Key/Secret作成
- [ ] JWT Secret生成

### デプロイテスト
- [ ] ローカルDockerビルド成功
- [ ] GitHub Actionsワークフロー実行成功
- [ ] Cloud Runサービス起動成功

---

## トラブルシューティング

### エラー: "Permission denied"

**原因**: サービスアカウントに必要な権限が不足

**解決策**:
```bash
# 権限を再確認
gcloud projects get-iam-policy <YOUR_PROJECT_ID> \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:$SA_EMAIL"

# 不足している権限を追加（上記1.4を参照）
```

---

### エラー: "API not enabled"

**原因**: 必要なGCP APIが有効化されていない

**解決策**:
```bash
# 再度API有効化
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

---

### エラー: "Secret not found"

**原因**: GCP Secret Managerにシークレットが登録されていない

**解決策**:
```bash
# シークレット一覧確認
gcloud secrets list

# 不足しているシークレットを追加（上記3を参照）
```

---

### GitHub Actionsワークフローが失敗

**確認手順**:
1. GitHub Actions実行ログを確認
2. エラーメッセージから原因特定
3. 該当するセクションを再実行

**よくあるエラー**:
- `GCP_SA_KEY` のJSON形式が不正 → 再度コピー＆ペースト
- プロジェクトIDの typo → `GCP_PROJECT_ID` を再確認
- 権限不足 → サービスアカウント権限を再設定

---

## 参考リンク

- [Google Cloud Run Documentation](https://cloud.google.com/run/docs)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Shopify App Configuration](https://shopify.dev/docs/apps/tools/cli/configuration)
- [Coinbase Developer Platform](https://docs.cdp.coinbase.com/)
- [GCP Secret Manager](https://cloud.google.com/secret-manager/docs)

---

**最終更新**: 2025-11-22
