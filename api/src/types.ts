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

export interface Purchase {
  id: string;
  sku: string;
  qty: number;
  email: string;
  totalUSD: number;
  paid: boolean;
  createdAt: number;
}
