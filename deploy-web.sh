#!/bin/bash
set -e

echo "🚀 Deploying Crypify Web to Cloud Run..."

cd web

gcloud run deploy crypify-web \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --port 8080 \
  --set-env-vars "API_BASE_URL=${API_BASE_URL:-https://crypify-api-xxxxx.a.run.app}"

echo "✅ Web deployed successfully!"
