# Crypify Deployment Guide

## GitHub Actions による自動デプロイ

このプロジェクトは GitHub Actions を使用して Cloud Run に自動デプロイされます。

## セットアップ手順

### 1. Google Cloud の準備

```bash
# プロジェクト作成
gcloud projects create YOUR_PROJECT_ID

# プロジェクトを選択
gcloud config set project YOUR_PROJECT_ID

# 必要な API を有効化
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com

# Artifact Registry リポジトリ作成
gcloud artifacts repositories create crypify \
  --repository-format=docker \
  --location=asia-northeast1 \
  --description="Crypify Docker images"
```

### 2. サービスアカウント作成

```bash
# サービスアカウント作成
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Service Account"

# 必要な権限を付与
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# JSON キーを生成
gcloud iam service-accounts keys create key.json \
  --iam-account=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 3. Secret Manager にシークレットを追加

```bash
# CDP credentials
echo -n "your-cdp-api-key" | gcloud secrets create CDP_API_KEY --data-file=-
echo -n "your-cdp-api-secret" | gcloud secrets create CDP_API_SECRET --data-file=-

# SMTP credentials
echo -n "smtp.gmail.com" | gcloud secrets create SMTP_HOST --data-file=-
echo -n "587" | gcloud secrets create SMTP_PORT --data-file=-
echo -n "your-email@gmail.com" | gcloud secrets create SMTP_USER --data-file=-
echo -n "your-app-password" | gcloud secrets create SMTP_PASS --data-file=-

# App settings
echo -n "noreply@crypify.app" | gcloud secrets create FROM_EMAIL --data-file=-
echo -n "https://crypify-web-xxxxx.a.run.app" | gcloud secrets create FRONTEND_URL --data-file=-
echo -n "https://crypify-api-xxxxx.a.run.app" | gcloud secrets create API_BASE_URL --data-file=-
```

### 4. GitHub Secrets を設定

GitHub リポジトリの Settings > Secrets and variables > Actions で以下を追加：

- `GCP_PROJECT_ID`: Google Cloud プロジェクト ID
- `GCP_SA_KEY`: `key.json` の内容（全体をコピペ）

### 5. デプロイ

#### API を先にデプロイ

```bash
git add api/
git commit -m "Deploy API"
git push origin main
```

Actions タブで実行状況を確認。デプロイが完了したら、API の URL をコピー。

#### API URL を Secret Manager に設定

```bash
# API の URL で更新（web から参照するため）
echo -n "https://crypify-api-xxxxx.a.run.app" | \
  gcloud secrets versions add API_BASE_URL --data-file=-
```

#### Web をデプロイ

```bash
git add web/
git commit -m "Deploy Web"  
git push origin main
```

Actions タブで実行状況を確認。デプロイが完了したら、Web の URL をコピー。

#### Frontend URL を Secret Manager に設定

```bash
# Web の URL で更新（API がメール送信時に使用）
echo -n "https://crypify-web-xxxxx.a.run.app" | \
  gcloud secrets versions add FRONTEND_URL --data-file=-
```

## デプロイフロー

### API デプロイ (`.github/workflows/deploy-remix-webhook.yml`)

トリガー:
- `api/**` の変更を含む `main` ブランチへの push
- 手動実行 (workflow_dispatch)

処理:
1. Docker イメージをビルド (`api/Dockerfile`)
2. Artifact Registry にプッシュ
3. Cloud Run にデプロイ (asia-northeast1)
4. 環境変数とシークレットを設定

### Web デプロイ (`.github/workflows/deploy-next-wallet.yml`)

トリガー:
- `web/**` の変更を含む `main` ブランチへの push
- 手動実行 (workflow_dispatch)

処理:
1. Docker イメージをビルド (`web/Dockerfile`)
2. Artifact Registry にプッシュ
3. Cloud Run にデプロイ (asia-northeast1)
4. API_BASE_URL シークレットを設定

## トラブルシューティング

### ビルドエラー

```bash
# ローカルでビルドテスト
cd api
docker build -t test-api .

cd ../web
docker build -t test-web .
```

### デプロイログ確認

GitHub Actions の実行ログで詳細を確認できます。

### Cloud Run ログ確認

```bash
# API のログ
gcloud run services logs read crypify-api --region asia-northeast1

# Web のログ
gcloud run services logs read crypify-web --region asia-northeast1
```

## 注意事項

- **初回デプロイ**: API → Web の順番でデプロイしてください
- **シークレット更新**: Secret Manager で更新後、Cloud Run サービスを再デプロイする必要があります
- **コスト**: Cloud Run は min-instances=0 なのでリクエストがない時は課金されません
- **リージョン**: asia-northeast1 (東京) を使用しています
