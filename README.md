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

### Deploy API first

```bash
export CDP_API_KEY="your_api_key"
export CDP_API_SECRET="your_api_secret"
export SMTP_USER="your_email@gmail.com"
export SMTP_PASS="your_app_password"

chmod +x deploy-api.sh
./deploy-api.sh
```

### Deploy Web

Update `API_BASE_URL` in `deploy-web.sh` with your API Cloud Run URL, then:

```bash
chmod +x deploy-web.sh
./deploy-web.sh
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
- **Deployment**: Google Cloud Run
- **Email**: Nodemailer

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

