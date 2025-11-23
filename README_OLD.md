# Crypify - Crypto Payments Platform

Monorepo structure for accepting crypto payments with automatic wallet creation and rewards.

## 🚀 New Pivot Structure

This project has been restructured into a monorepo with standalone web and API services.

### Structure

```
crypify/
  web/        # Next.js frontend (UI only)
  api/        # Node/Express backend (CDP, payments, rewards, email)
```

## Features

- 🛍️ E-commerce shop with crypto payments
- 💼 Automatic wallet creation for users
- 💰 USDC payments on Base Sepolia testnet
- 🎁 10% gasless rewards
- 📧 Email notifications with wallet links

## Prerequisites

- Node.js 20+
- pnpm 9.0.0+
- Coinbase Developer Platform (CDP) API credentials
- SMTP credentials for email (Gmail recommended)
- Google Cloud account (for Cloud Run deployment)

## Local Development

### Install dependencies

```bash
# Install pnpm globally if needed
npm install -g pnpm@9.0.0

# Install all workspace dependencies
pnpm install
```

### Setup API

```bash
cd api
cp .env.example .env
# Edit .env with your credentials
pnpm dev
```

### Setup Web

```bash
cd web
pnpm dev
```

Visit http://localhost:3000

## Environment Variables

### API (.env)

```
CDP_API_KEY=your_api_key_name
CDP_API_SECRET=your_api_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_EMAIL=noreply@crypify.app
FRONTEND_URL=http://localhost:3000
```

### Web (.env.local)

```
API_BASE_URL=http://localhost:8080
```

## Deployment to Cloud Run

Deployment is automated via GitHub Actions when you push to the `main` branch.

### Prerequisites

1. Create Google Cloud project and enable Cloud Run, Artifact Registry
2. Create service account with necessary permissions
3. Add GitHub secrets:
   - `GCP_PROJECT_ID`: Your Google Cloud project ID
   - `GCP_SA_KEY`: Service account JSON key
   
4. Add Google Secret Manager secrets:
   - `CDP_API_KEY`: Coinbase Developer Platform API key
   - `CDP_API_SECRET`: Coinbase Developer Platform API secret
   - `SMTP_HOST`: SMTP server host (e.g., smtp.gmail.com)
   - `SMTP_PORT`: SMTP server port (e.g., 587)
   - `SMTP_USER`: SMTP username
   - `SMTP_PASS`: SMTP password
   - `FROM_EMAIL`: From email address
   - `FRONTEND_URL`: Frontend URL (set after web deployment)
   - `API_BASE_URL`: API URL (set after api deployment)

### Deploy API

```bash
git add .
git commit -m "Deploy API"
git push origin main
```

This triggers `.github/workflows/deploy-remix-webhook.yml` which:
1. Builds Docker image for `api/`
2. Pushes to Artifact Registry
3. Deploys to Cloud Run (asia-northeast1)

### Deploy Web

After API is deployed, update `API_BASE_URL` secret with the API Cloud Run URL, then:

```bash
git add .
git commit -m "Deploy Web"
git push origin main
```

This triggers `.github/workflows/deploy-next-wallet.yml` which:
1. Builds Docker image for `web/`
2. Pushes to Artifact Registry
3. Deploys to Cloud Run (asia-northeast1)

### Manual Deploy (alternative)

If you prefer manual deployment:

```bash
# API
cd api
gcloud run deploy crypify-api \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated

# Web
cd web
gcloud run deploy crypify-web \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated
```

## Flow

1. User selects product and enters email → `/shop`
2. Purchase record created → `/thanks`
3. User clicks "Pay with Crypto"
4. Backend:
   - Creates wallet (CDP)
   - Sends USDC payment
   - Sends 10% gasless reward
   - Emails wallet link
5. User can view wallet and rewards → `/wallet`

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Backend**: Node.js, Express, TypeScript
- **Blockchain**: Coinbase Developer Platform (CDP), Base Sepolia
- **Deployment**: Google Cloud Run, GitHub Actions
- **Package Manager**: pnpm 9.0.0
- **Email**: Nodemailer

## Project Structure

```
crypify/
├── .github/workflows/
│   ├── deploy-web.yml      # Web deployment workflow
│   └── deploy-api.yml      # API deployment workflow
├── api/                     # Backend API
│   ├── src/
│   │   ├── routes/         # API routes (purchase, pay, wallet)
│   │   ├── services/       # Business logic (CDP, email)
│   │   ├── types.ts        # TypeScript types
│   │   └── index.ts        # Express app
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── web/                     # Frontend (Next.js)
│   ├── app/
│   │   ├── shop/           # Product selection
│   │   ├── thanks/         # Payment execution
│   │   ├── wallet/         # Wallet view
│   │   └── layout.tsx
│   ├── lib/api.ts          # API client
│   ├── Dockerfile
│   ├── package.json
│   └── next.config.js
├── specs/                   # Documentation
│   ├── purchase.md         # /purchase endpoint spec
│   ├── pay.md              # /pay endpoint spec
│   └── wallet.md           # /wallet endpoint spec
├── pnpm-workspace.yaml     # pnpm workspace config
├── package.json            # Root package.json
├── DEPLOYMENT.md           # Deployment guide
└── README.md

## TODO for Production

- [ ] Replace in-memory storage with database (PostgreSQL/Firebase)
- [ ] Implement real CDP wallet creation and transfers
- [ ] Add authentication for wallet access
- [ ] Set up master wallet for USDC distribution
- [ ] Add webhook for payment confirmations
- [ ] Implement proper error handling and retries
- [ ] Add rate limiting
- [ ] Set up monitoring and logging
- [ ] Add tests

## Old Files

Previous Shopify Payment Extension implementation:
- `frontend-payext/` - Shopify extension (before pivot)
- `specs/` - Specification documents

