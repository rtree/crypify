/**
 * 一度だけ実行: Merchant Server Walletを作成してアドレスを取得
 * 
 * 実行方法:
 * cd /home/araki/crypify/api
 * CDP_API_KEY_ID="..." CDP_API_KEY_SECRET="..." CDP_WALLET_SECRET="..." npx tsx scripts/createMerchantWallet.ts
 */

import { CdpClient } from "@coinbase/cdp-sdk";

async function main() {
  console.log("🔧 Creating Merchant Server Wallet...\n");

  // CDP SDK v2 Client初期化
  const cdp = new CdpClient({
    apiKeyId: process.env.CDP_API_KEY!,
    apiKeySecret: process.env.CDP_API_SECRET!,
    walletSecret: process.env.CDP_WALLET_SECRET!,
  });

  // Server Wallet作成（名前付き）
  const merchantAccount = await cdp.evm.createAccount({
    name: "Crypify-Merchant-Wallet",
  });

  console.log("✅ Merchant Wallet Created!\n");
  console.log("📋 Save these values to Secret Manager:\n");
  console.log(`MERCHANT_WALLET_ADDRESS=${merchantAccount.address}`);
  console.log("\n");
  console.log("💡 Next steps:");
  console.log("1. Add MERCHANT_WALLET_ADDRESS to Google Cloud Secret Manager");
  console.log("2. Fund this wallet with USDC on Base Sepolia for reward distribution");
  console.log(`3. Wallet address: ${merchantAccount.address}`);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
