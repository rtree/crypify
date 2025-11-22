#!/bin/bash
set -e

echo "🚀 Deploying Crypify API to Cloud Run..."

cd api

# Required environment variables
if [ -z "$CDP_API_KEY" ] || [ -z "$CDP_API_SECRET" ]; then
  echo "❌ Error: CDP_API_KEY and CDP_API_SECRET must be set"
  exit 1
fi

gcloud run deploy crypify-api \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --port 8080 \
  --set-env-vars "\
CDP_API_KEY=${CDP_API_KEY},\
CDP_API_SECRET=${CDP_API_SECRET},\
SMTP_HOST=${SMTP_HOST:-smtp.gmail.com},\
SMTP_PORT=${SMTP_PORT:-587},\
SMTP_USER=${SMTP_USER},\
SMTP_PASS=${SMTP_PASS},\
FROM_EMAIL=${FROM_EMAIL:-noreply@crypify.app},\
FRONTEND_URL=${FRONTEND_URL:-https://crypify-web-xxxxx.a.run.app}"

echo "✅ API deployed successfully!"
echo "📝 Don't forget to update API_BASE_URL in web deployment"
