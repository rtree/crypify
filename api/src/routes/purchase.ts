import { Router, Request, Response } from "express";
import { PurchaseRequest, PurchaseResponse, Purchase } from "../types";

const router = Router();

// In-memory storage (本番ではDBに置き換え)
const purchases: Map<string, Purchase> = new Map();
const inventory: Map<string, number> = new Map([
  ["hoodie", 100],
  ["tshirt", 200],
  ["cap", 150],
]);

const prices: Map<string, number> = new Map([
  ["hoodie", 50],
  ["tshirt", 25],
  ["cap", 15],
]);

router.post("/", (req: Request, res: Response) => {
  try {
    const { sku, qty, email }: PurchaseRequest = req.body;

    // Validation
    if (!sku || !qty || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!inventory.has(sku)) {
      return res.status(400).json({ error: "Invalid SKU" });
    }

    const available = inventory.get(sku)!;
    if (qty > available) {
      return res.status(400).json({ error: "Insufficient inventory" });
    }

    // Create purchase record
    const purchaseId = `PUR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const price = prices.get(sku)!;
    const totalUSD = price * qty;

    const purchase: Purchase = {
      id: purchaseId,
      sku,
      qty,
      email,
      totalUSD,
      paid: false,
      createdAt: Date.now(),
    };

    purchases.set(purchaseId, purchase);

    // Reserve inventory (decrease)
    inventory.set(sku, available - qty);

    const response: PurchaseResponse = {
      purchaseId,
      sku,
      qty,
      totalUSD,
    };

    console.log(`✅ Purchase created: ${purchaseId}`);
    res.json(response);
  } catch (error) {
    console.error("Error in /purchase:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper to get purchase (for /pay to use)
export function getPurchase(purchaseId: string): Purchase | undefined {
  return purchases.get(purchaseId);
}

export function markPurchaseAsPaid(purchaseId: string): void {
  const purchase = purchases.get(purchaseId);
  if (purchase) {
    purchase.paid = true;
  }
}

export default router;
