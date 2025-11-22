# Crypify セットアップ手順

## 1. 前提条件

- Node.js 20以上
- pnpm 9.0.0以上
- Google Cloud CLI
- GitHub CLI
- SendGrid アカウント
- Coinbase Developer Platform アカウント

## 2. リポジトリのクローン

```bash
git clone https://github.com/rtree/crypify.git
cd crypify
```

## 3. 依存関係のインストール

```bash
pnpm install
```

## 4. 環境変数の設定

### 4.1 SendGrid の設定

1. [SendGrid](https://sendgrid.com/) にサインアップ
2. API Key を作成（Settings > API Keys）
   - Permissions: Full Access（または Mail Send のみ）
3. Sender Identity を設定（Settings > Sender Authentication）
   - Single Sender Verification で検証メールアドレスを登録

### 4.2 Coinbase Developer Platform の設定

1. [CDP Portal](https://portal.cdp.coinbase.com/) にサインアップ
2. API キーを作成
   - Organization > API Keys > Create API Key
   - Permissions: `wallet:read`, `wallet:create`, `transaction:send`
3. Network を選択: Base Sepolia

### 4.3 ローカル開発環境

```bash
# api/.env を作成
cd api
cat > .env << 'EOF'
# CDP Credentials
CDP_API_KEY=your_cdp_api_key_here
CDP_API_SECRET=your_cdp_api_secret_here

# SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=your_verified_email@example.com

# App Settings
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
PORT=8080
EOF

# web/.env.local を作成
cd ../web
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
EOF
```

## 5. Google Cloud Platform の設定

### 5.1 プロジェクト作成

```bash
# プロジェクトID を設定（例: crypify-prod-12345）
export PROJECT_ID=your-project-id

# プロジェクト作成
gcloud projects create $PROJECT_ID
gcloud config set project $PROJECT_ID

# 課金アカウントを有効化（GCP Console で手動設定）
```

### 5.2 必要な API を有効化

```bash
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com
```

### 5.3 Artifact Registry リポジトリ作成

```bash
gcloud artifacts repositories create crypify \
  --repository-format=docker \
  --location=asia-northeast1 \
  --description="Crypify Docker images"
```

### 5.4 Secret Manager にシークレットを追加

```bash
# CDP credentials
echo -n "your_cdp_api_key" | \
  gcloud secrets create CDP_API_KEY --data-file=-

echo -n "your_cdp_api_secret" | \
  gcloud secrets create CDP_API_SECRET --data-file=-

# SendGrid
echo -n "your_sendgrid_api_key" | \
  gcloud secrets create SENDGRID_API_KEY --data-file=-

echo -n "your_verified_email@example.com" | \
  gcloud secrets create FROM_EMAIL --data-file=-

# Frontend URL / API URL (初回はダミー値で作成)
# ⚠️ 重要: GitHub Actions がこれらのシークレットを参照するため、
#         デプロイ前に作成が必須（値は後で更新）
echo -n "http://localhost:3000" | \
  gcloud secrets create FRONTEND_URL --data-file=-

echo -n "http://localhost:8080" | \
  gcloud secrets create API_BASE_URL --data-file=-
```

### 5.5 サービスアカウント作成

```bash
# サービスアカウント作成
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deployer"

# 必要な権限を付与
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# JSON キーを生成
gcloud iam service-accounts keys create gcp-key.json \
  --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com

# キーの内容を表示（GitHub Secrets に登録する）
cat gcp-key.json
```

## 6. GitHub Secrets の設定

GitHub リポジトリの **Settings > Secrets and variables > Actions** で以下を追加：

| Secret Name | Value |
|------------|-------|
| `GCP_PROJECT_ID` | GCPプロジェクトID |
| `GCP_SA_KEY` | `gcp-key.json` の内容全体 |

## 7. ローカル開発

```bash
# API を起動（別ターミナル）
pnpm dev:api

# Web を起動（別ターミナル）
pnpm dev:web
```

### 動作確認

- API: http://localhost:8080
- Web: http://localhost:3000

## 8. デプロイ

### 8.1 API デプロイ（先に実行）

```bash
git add api/
git commit -m "Deploy API to Cloud Run"
git push origin main
```

GitHub Actions で自動デプロイが実行されます。完了後、API URLを確認：

```bash
gcloud run services describe crypify-api \
  --region=asia-northeast1 \
  --format='value(status.url)'
```

### 8.2 API URL を Secret Manager に登録

```bash
# APIのURLで更新
echo -n "https://crypify-api-xxxxx.a.run.app" | \
  gcloud secrets versions add API_BASE_URL --data-file=-
```

### 8.3 Web デプロイ

```bash
git add web/
git commit -m "Deploy Web to Cloud Run"
git push origin main
```

GitHub Actions で自動デプロイが実行されます。完了後、Web URLを確認：

```bash
gcloud run services describe crypify-web \
  --region=asia-northeast1 \
  --format='value(status.url)'
```

### 8.4 Frontend URL を Secret Manager に登録

```bash
# WebのURLで更新
echo -n "https://crypify-web-xxxxx.a.run.app" | \
  gcloud secrets versions add FRONTEND_URL --data-file=-
```

### 8.5 サービスを再起動（環境変数反映）

```bash
# API を再デプロイ（FRONTEND_URLを反映）
gcloud run services update crypify-api \
  --region=asia-northeast1 \
  --update-env-vars DUMMY=1  # 環境変数を更新してリビジョン作成

# Web を再デプロイ（API_BASE_URLを反映）
gcloud run services update crypify-web \
  --region=asia-northeast1 \
  --update-env-vars DUMMY=1
```

## 9. 動作確認

### API エンドポイント

```bash
API_URL=$(gcloud run services describe crypify-api \
  --region=asia-northeast1 \
  --format='value(status.url)')

# ヘルスチェック
curl $API_URL/

# 購入テスト
curl -X POST $API_URL/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "hoodie",
    "qty": 1,
    "email": "test@example.com"
  }'
```

### Web アクセス

```bash
WEB_URL=$(gcloud run services describe crypify-web \
  --region=asia-northeast1 \
  --format='value(status.url)')

echo "Visit: $WEB_URL"
```

## 10. モニタリング

### ログ確認

```bash
# API ログ
gcloud run services logs read crypify-api \
  --region=asia-northeast1 \
  --limit=50

# Web ログ
gcloud run services logs read crypify-web \
  --region=asia-northeast1 \
  --limit=50
```

### メトリクス確認

```bash
# リクエスト数
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_count"'
```

## トラブルシューティング

### SendGrid メール送信エラー

```bash
# SendGrid API Key を確認
gcloud secrets versions access latest --secret="SENDGRID_API_KEY"

# FROM_EMAIL が検証済みか確認
# SendGrid Console > Settings > Sender Authentication
```

### CDP API エラー

```bash
# CDP credentials を確認
gcloud secrets versions access latest --secret="CDP_API_KEY"
gcloud secrets versions access latest --secret="CDP_API_SECRET"

# CDP Portal で API Key のステータス確認
```

### Cloud Run デプロイエラー

```bash
# GitHub Actions のログを確認
gh run list --limit 5
gh run view <run-id> --log-failed
```

## セキュリティチェックリスト

- [ ] Secret Manager のシークレットが正しく設定されている
- [ ] サービスアカウントの権限が最小限になっている
- [ ] Cloud Run サービスが認証不要（`--allow-unauthenticated`）だが、本番環境では検討
- [ ] SendGrid の Sender が検証済み
- [ ] CDP API キーが本番用（テスト用でない）
- [ ] CORS 設定が適切
- [ ] 環境変数に機密情報が含まれていない

## コスト最適化

- Cloud Run は min-instances=0 でリクエストがない時は課金なし
- SendGrid 無料枠: 100通/日
- CDP 無料枠を確認
- Artifact Registry のストレージを定期的にクリーンアップ

```bash
# 古いイメージを削除
gcloud artifacts docker images list \
  asia-northeast1-docker.pkg.dev/$PROJECT_ID/crypify/crypify-api \
  --sort-by=CREATE_TIME \
  --limit=10
```
