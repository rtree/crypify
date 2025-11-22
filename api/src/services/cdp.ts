import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";
import * as crypto from "crypto";

// Initialize CDP
const apiKeyName = process.env.CDP_API_KEY!;
const privateKey = process.env.CDP_API_SECRET!;

if (!apiKeyName || !privateKey) {
  throw new Error("CDP_API_KEY and CDP_API_SECRET must be set");
}

Coinbase.configure({ apiKeyName, privateKey });

// In-memory wallet storage (本番ではDBに置き換え)
interface WalletData {
  email: string;
  address: string;
  walletId: string;
  seed: string;
  createdAt: number;
  rewardHistory: Array<{
    txHash: string;
    amount: string;
    timestamp: number;
  }>;
}

const wallets: Map<string, WalletData> = new Map();
const emailToToken: Map<string, string> = new Map();
const tokenToEmail: Map<string, string> = new Map();

// USDC contract on Base Sepolia
const USDC_CONTRACT_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const BASE_SEPOLIA_NETWORK = "base-sepolia";

/**
 * Create a wallet for user (server-signer model)
 */
export async function createWallet(email: string): Promise<{ address: string; walletId: string }> {
  // Check if wallet already exists
  const existing = wallets.get(email);
  if (existing) {
    console.log(`Wallet already exists for ${email}`);
    return { address: existing.address, walletId: existing.walletId };
  }

  // Create new wallet
  const user = await Coinbase.createWallet({
    networkId: BASE_SEPOLIA_NETWORK,
  });

  const defaultAddress = await user.getDefaultAddress();
  const address = defaultAddress?.getId() || "";

  const walletData: WalletData = {
    email,
    address,
    walletId: user.getId()!,
    seed: user.export().seed,
    createdAt: Date.now(),
    rewardHistory: [],
  };

  wallets.set(email, walletData);

  console.log(`✅ Created wallet for ${email}: ${address}`);
  return { address, walletId: walletData.walletId };
}

/**
 * Send USDC to user's wallet (Base Sepolia)
 */
export async function sendUSDC(toAddress: string, amountUSD: number): Promise<string> {
  // For demo: use a master wallet that holds USDC
  // In production, integrate with payment gateway
  
  // NOTE: この部分は実際にマスターウォレットを用意して実装する必要があります
  // ここではダミーのtxHashを返します
  
  console.log(`Sending ${amountUSD} USDC to ${toAddress}...`);
  
  // Simulate transaction
  const txHash = `0x${crypto.randomBytes(32).toString('hex')}`;
  
  // TODO: Real implementation
  // const masterWallet = await Coinbase.importWallet({
  //   walletId: process.env.MASTER_WALLET_ID!,
  //   seed: process.env.MASTER_WALLET_SEED!,
  // });
  // 
  // const transfer = await masterWallet.createTransfer({
  //   amount: amountUSD,
  //   assetId: "USDC",
  //   destination: toAddress,
  //   networkId: BASE_SEPOLIA_NETWORK,
  // });
  // 
  // await transfer.wait();
  // const txHash = transfer.getTransactionHash();

  return txHash;
}

/**
 * Send gasless reward (10% of purchase)
 */
export async function sendReward(toAddress: string, amountUSD: number): Promise<string> {
  console.log(`Sending ${amountUSD} USDC reward (gasless) to ${toAddress}...`);

  // Find the wallet data to add to reward history
  const walletData = Array.from(wallets.values()).find(w => w.address === toAddress);
  
  // Simulate gasless transaction
  const txHash = `0x${crypto.randomBytes(32).toString('hex')}`;

  if (walletData) {
    walletData.rewardHistory.push({
      txHash,
      amount: amountUSD.toFixed(2),
      timestamp: Date.now(),
    });
  }

  // TODO: Real implementation with CDP gasless transfer
  // const transfer = await Coinbase.createTransfer({
  //   amount: amountUSD,
  //   assetId: "USDC",
  //   destination: toAddress,
  //   networkId: BASE_SEPOLIA_NETWORK,
  //   gasless: true, // Sponsor gas fees
  // });
  // 
  // await transfer.wait();
  // const txHash = transfer.getTransactionHash();

  return txHash;
}

/**
 * Get wallet link token for user
 */
export function getWalletLinkToken(email: string): string {
  let token = emailToToken.get(email);
  
  if (!token) {
    token = crypto.randomBytes(32).toString('hex');
    emailToToken.set(email, token);
    tokenToEmail.set(token, email);
  }

  return token;
}

/**
 * Resolve email from wallet link token
 */
export function resolveEmailFromToken(token: string): string | null {
  return tokenToEmail.get(token) || null;
}

/**
 * Get wallet info for user
 */
export async function getWalletInfo(email: string): Promise<WalletData | null> {
  const walletData = wallets.get(email);
  
  if (!walletData) {
    return null;
  }

  // TODO: Get real balance from blockchain
  // const wallet = await Coinbase.importWallet({
  //   walletId: walletData.walletId,
  //   seed: walletData.seed,
  // });
  // const balance = await wallet.getBalance("USDC");

  // For now, calculate from reward history
  const balance = walletData.rewardHistory
    .reduce((sum, r) => sum + parseFloat(r.amount), 0)
    .toFixed(2);

  return {
    ...walletData,
    balance,
  };
}
