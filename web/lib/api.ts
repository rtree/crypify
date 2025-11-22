const API_BASE = process.env.API_BASE_URL!;

if (!API_BASE) {
  throw new Error("API_BASE_URL must be set");
}

export interface PurchaseRequest {
  sku: string;
  qty: number;
  email: string;
}

export interface PurchaseResponse {
  purchaseId: string;
  sku: string;
  qty: number;
  totalUSD: number;
}

export interface PayRequest {
  purchaseId: string;
  email: string;
}

export interface PayResponse {
  success: boolean;
  txHash: string;
  rewardTxHash: string;
  walletLinkToken: string;
  message: string;
}

export interface WalletResponse {
  email: string;
  address: string;
  balance: string;
  rewardHistory: Array<{
    txHash: string;
    amount: string;
    timestamp: number;
  }>;
}

export async function createPurchase(payload: PurchaseRequest): Promise<PurchaseResponse> {
  const res = await fetch(`${API_BASE}/purchase`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Purchase failed: ${error}`);
  }
  
  return res.json();
}

export async function pay(payload: PayRequest): Promise<PayResponse> {
  const res = await fetch(`${API_BASE}/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Payment failed: ${error}`);
  }
  
  return res.json();
}

export async function fetchWallet(token: string): Promise<WalletResponse> {
  const res = await fetch(`${API_BASE}/wallet?token=${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Wallet fetch failed: ${error}`);
  }
  
  return res.json();
}
