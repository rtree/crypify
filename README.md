# Crypify - Decentralized Crypto Rewards Platform

> **Seamless crypto payments with automatic wallet creation and gasless rewards**

Crypify is a production-ready e-commerce platform that demonstrates the power of Coinbase Developer Platform (CDP) by combining **Embedded Wallets** for user payments with **Server Wallets** for gasless reward distribution.

## 🌟 Project Significance

### The Problem
Traditional e-commerce platforms struggle with crypto adoption because:
- Users need to manage complex wallets and private keys
- High gas fees discourage small transactions  
- Reward distribution requires manual processes
- No seamless integration between fiat and crypto ecosystems

### Our Solution
Crypify eliminates these barriers by:
- **Zero-friction onboarding**: Email OTP authentication creates wallets automatically (CDP Embedded Wallets)
- **Gasless rewards**: Server-side distribution eliminates gas costs for users (CDP Server Wallets)
- **Instant liquidity**: Users can spend rewards immediately without additional setup
- **Email-based recovery**: No seed phrases to remember - wallet access tied to email

## 🏗️ Architecture

Monorepo structure with microservices deployment on Google Cloud Run:

```
crypify/
  web/        # Next.js 14 frontend with CDP Embedded Wallets
  api/        # Express backend with CDP Server Wallets
  specs/      # Technical documentation
```

### System Flow

```
┌─────────────┐
│   User      │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. Browse products
       ▼
┌─────────────────────┐
│   Web Service       │
│  (Next.js + CDP)    │
│                     │
│ • Product catalog   │
│ • Email OTP auth    │
│ • USDC payment UI   │
│ • Embedded Wallets  │
└──────┬──────────────┘
       │
       │ 2. Payment notification
       ▼
┌─────────────────────┐
│   API Service       │
│ (Express + CDP)     │
│                     │
│ • Payment tracking  │
│ • Reward calculation│
│ • Email with claim  │
│ • Server Wallets    │
└──────┬──────────────┘
       │
       │ 3. Gasless reward transfer
       ▼
┌─────────────────────┐
│  Coinbase CDP       │
│                     │
│ • Wallet management │
│ • USDC transfers    │
│ • Base Sepolia      │
└─────────────────────┘
```

## 💡 Unique Implementation Details

### Hybrid CDP Architecture

We leverage **two distinct CDP wallet systems** working in harmony:

#### 1. Embedded Wallets (User-Controlled)
```typescript
// Frontend: Email OTP authentication
const { signInWithEmail } = useSignInWithEmail();
await signInWithEmail(email);

// CDP automatically manages wallet lifecycle
// userId = email → persistent wallet address
```

**Why?**
- Users own their private keys (non-custodial)
- Zero setup friction (no MetaMask required)
- Email-based recovery (familiar UX)
- Perfect for **payment flows**

#### 2. Server Wallets (Developer-Controlled)
```typescript
// Backend: Merchant wallet management
const merchant = await Wallet.fetch(process.env.MERCHANT_WALLET_ID);

// Gasless reward distribution
await merchant.createTransfer({
  amount: rewardAmount,
  assetId: USDC_CONTRACT,
  destination: userAddress,
  gasless: true  // 🎯 User pays zero gas
});
```

**Why?**
- Automated backend operations
- Gasless transfers (better UX)
- Centralized fund management
- Perfect for **reward distribution**

### HMAC-Signed Claim Links

No database required for claim validation:

```typescript
// Generate tamper-proof claim token
const token = makeClaimToken({
  email,
  userAddress,
  rewardUsd,
  expiresAt: Date.now() + 24 * 3600 * 1000
});

// Email: https://crypify.app/claim?token=eyJ...
```

**Security features:**
- HMAC-SHA256 signature prevents tampering
- Time-based expiration (24 hours)
- Stateless validation (no DB lookup)
- Replay-resistant (one-time use tracked via frontend)

### Build-Time Environment Variable Injection

Next.js `NEXT_PUBLIC_*` variables require special handling in Docker:

```dockerfile
# Build stage - Accept build arguments
ARG NEXT_PUBLIC_CDP_PROJECT_ID
ARG NEXT_PUBLIC_API_BASE_URL

# Inject into build environment
ENV NEXT_PUBLIC_CDP_PROJECT_ID=$NEXT_PUBLIC_CDP_PROJECT_ID
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

# Build with embedded variables
RUN pnpm build
```

**Why this matters:**
- Next.js bundles `NEXT_PUBLIC_*` at **build time**, not runtime
- Runtime env vars don't work for client-side code
- Our solution: GitHub Actions → Secret Manager → Docker build args

## 🚀 Features

- 🛍️ **E-commerce shop** with crypto payments (USDC on Base Sepolia)
- 💼 **Automatic wallet creation** via Email OTP (no MetaMask needed)
- 💰 **10% cashback rewards** distributed gaslessly
- 📧 **Email notifications** with tamper-proof claim links
- 🔐 **Zero-knowledge architecture** - no user data stored
- ⚡ **Instant settlement** - blockchain-native transactions

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Wallet SDK**: `@coinbase/cdp-hooks` (Embedded Wallets)
- **Blockchain**: viem + wagmi (Base Sepolia)
- **Deployment**: Google Cloud Run (containerized)

### Backend
- **Runtime**: Node.js 20 + Express
- **Wallet SDK**: `@coinbase/coinbase-sdk` (Server Wallets)
- **Email**: SendGrid (transactional emails)
- **Deployment**: Google Cloud Run + Secret Manager

### DevOps
- **CI/CD**: GitHub Actions (automated deployment)
- **Container Registry**: Google Artifact Registry
- **Secrets**: Google Secret Manager
- **Monitoring**: Cloud Run metrics

## 📦 Local Development

### Prerequisites
- Node.js 20+
- pnpm 9.0.0+
- Coinbase Developer Platform account
- SendGrid API key
- Google Cloud account (for deployment)

### Setup

1. **Clone repository**
```bash
git clone https://github.com/rtree/crypify.git
cd crypify
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Configure API**
```bash
cd api
cp .env.example .env
# Edit .env with your credentials:
# - CDP_API_KEY, CDP_API_SECRET
# - SENDGRID_API_KEY, FROM_EMAIL
# - MERCHANT_WALLET_ADDRESS, CLAIM_SECRET
pnpm dev  # Runs on http://localhost:8080
```

4. **Configure Web**
```bash
cd web
cp .env.local.example .env.local
# Edit .env.local:
# - NEXT_PUBLIC_CDP_PROJECT_ID (from CDP Portal)
# - NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
pnpm dev  # Runs on http://localhost:3000
```

5. **Visit** http://localhost:3000

## 🌐 Production Deployment

Deployment is fully automated via GitHub Actions when pushing to `main` branch.

### Setup Steps

1. **Create Google Cloud Project**
   - Enable Cloud Run, Artifact Registry, Secret Manager APIs
   - Create service account with required permissions

2. **Configure GitHub Secrets**
   - `GCP_PROJECT_ID`: Your GCP project ID
   - `GCP_SA_KEY`: Service account JSON key

3. **Populate Secret Manager**
```bash
# CDP credentials
echo -n "YOUR_API_KEY" | gcloud secrets create CDP_API_KEY --data-file=-
echo -n "YOUR_API_SECRET" | gcloud secrets create CDP_API_SECRET --data-file=-
echo -n "YOUR_PROJECT_ID" | gcloud secrets create CDP_PROJECT_ID --data-file=-

# Email
echo -n "YOUR_SENDGRID_KEY" | gcloud secrets create SENDGRID_API_KEY --data-file=-
echo -n "noreply@crypify.app" | gcloud secrets create FROM_EMAIL --data-file=-

# Application
echo -n "YOUR_MERCHANT_ADDRESS" | gcloud secrets create MERCHANT_WALLET_ADDRESS --data-file=-
echo -n "$(openssl rand -hex 32)" | gcloud secrets create CLAIM_SECRET --data-file=-
```

4. **Deploy**
```bash
git push origin main
```

GitHub Actions will:
- Build Docker images with embedded environment variables
- Push to Artifact Registry
- Deploy to Cloud Run (asia-northeast1)
- Configure secrets and environment variables

### Production URLs
- **Web**: https://crypify-web-kkz6k4jema-an.a.run.app
- **API**: https://crypify-api-kkz6k4jema-an.a.run.app

## 📖 User Flow

1. **Browse Products** → User visits `/shop` and selects a product
2. **Email OTP Login** → CDP Embedded Wallet created automatically
3. **Pay with USDC** → User approves transaction (Embedded Wallet signature)
4. **Backend Processing** → API calculates 10% reward and sends email
5. **Claim Reward** → User clicks email link → Gasless USDC transfer from Server Wallet
6. **View Wallet** → User can check balance and transaction history

## 🔒 Security Considerations

### HMAC Claim Tokens
- SHA-256 signature with 256-bit secret
- Payload includes: `{email, userAddress, rewardUsd, expiresAt}`
- 24-hour expiration window
- Stateless validation (no database required)

### Gasless Transfer Limits
- Source: Merchant Server Wallet (CDP-managed)
- Network: Base Sepolia (testnet)
- Asset: USDC only
- Maximum: Wallet balance limit

### Cloud Run Security
- Secrets stored in Secret Manager (not environment variables)
- Stateless containers (auto-scaling, no session persistence)
- HTTPS-only (automatic TLS certificates)
- IAM-based access control

## 📊 Project Structure

```
crypify/
├── .github/workflows/
│   ├── deploy-web.yml           # Web deployment pipeline
│   └── deploy-api.yml           # API deployment pipeline
├── api/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── claim.ts         # Reward claim endpoint
│   │   │   ├── fundWallet.ts    # Gas funding endpoint
│   │   │   ├── merchant.ts      # Merchant address endpoint
│   │   │   ├── pay.ts           # Payment notification
│   │   │   └── purchase.ts      # Purchase creation
│   │   ├── services/
│   │   │   └── email.ts         # SendGrid integration
│   │   ├── lib/
│   │   │   ├── cdp.ts           # CDP SDK initialization
│   │   │   └── claimToken.ts    # HMAC token utilities
│   │   ├── types.ts             # TypeScript definitions
│   │   └── index.ts             # Express app
│   ├── Dockerfile               # Multi-stage production build
│   └── package.json
├── web/
│   ├── app/
│   │   ├── shop/                # Product catalog
│   │   │   └── page.tsx
│   │   ├── thanks/              # Payment page
│   │   │   ├── page.tsx
│   │   │   └── PayWithCrypto.tsx  # Embedded Wallet UI
│   │   ├── claim/               # Reward claim page
│   │   │   ├── page.tsx
│   │   │   └── ClaimWithAuth.tsx
│   │   ├── wallet/              # Wallet dashboard
│   │   │   └── page.tsx
│   │   ├── CDPProvider.tsx      # CDP hooks provider
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── lib/
│   │   └── api.ts               # API client utilities
│   ├── public/
│   │   └── shop/                # Static shop assets
│   ├── Dockerfile               # Next.js production build
│   ├── next.config.js
│   └── package.json
├── specs/
│   ├── MVP_FINALDESIGN.md       # Architecture documentation
│   ├── DEPLOYMENT.md            # Deployment guide
│   └── PROCEDURE.md             # Development procedures
├── pnpm-workspace.yaml          # Monorepo configuration
└── README.md
```

## 🎯 Roadmap

### Current (MVP)
- ✅ Embedded Wallets with Email OTP
- ✅ Server Wallets for gasless transfers
- ✅ HMAC-signed claim links
- ✅ Production deployment on Cloud Run
- ✅ Automated CI/CD with GitHub Actions

### Future Enhancements
- [ ] CDP OnRamp integration (fiat → crypto)
- [ ] Multi-chain support (Ethereum, Polygon, Arbitrum)
- [ ] Firestore for claim deduplication
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] NFT rewards for loyal customers

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines and submit pull requests.

## 📞 Support

- **Documentation**: See `/specs` directory
- **Issues**: GitHub Issues
- **CDP Docs**: https://docs.cdp.coinbase.com

---

Built with ❤️ using [Coinbase Developer Platform](https://www.coinbase.com/developer-platform)
