import { CdpClient } from "@coinbase/cdp-sdk";

// CDP SDK v2 Client初期化
const cdp = new CdpClient({
  apiKeyId: process.env.CDP_API_KEY_ID!,
  apiKeySecret: process.env.CDP_API_KEY_SECRET!,
  walletSecret: process.env.CDP_WALLET_SECRET!,
});

// Merchant Server Wallet取得
export async function getMerchantWallet() {
  const merchantAddress = process.env.MERCHANT_WALLET_ADDRESS! as `0x${string}`;
  
  if (!merchantAddress) {
    throw new Error("MERCHANT_WALLET_ADDRESS not configured");
  }
  
  // CDP SDK v2: Server Account取得
  const account = await cdp.evm.getAccount({ address: merchantAddress });
  return account;
}
