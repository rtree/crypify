import { Router } from "express";
import { PayRequest, PayResponse } from "../types";
import { getPurchase, markPurchaseAsPaid } from "./purchase";
import { createWallet, sendUSDC, sendReward, getWalletLinkToken } from "../services/cdp";
import { sendPaymentEmail } from "../services/email";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { purchaseId, email }: PayRequest = req.body;

    // Validation
    if (!purchaseId || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get purchase record
    const purchase = getPurchase(purchaseId);
    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    if (purchase.email !== email) {
      return res.status(403).json({ error: "Email mismatch" });
    }

    if (purchase.paid) {
      return res.status(400).json({ error: "Already paid" });
    }

    console.log(`💳 Processing payment for ${purchaseId}...`);

    // 1. Create wallet for user
    const wallet = await createWallet(email);
    console.log(`✅ Wallet created: ${wallet.address}`);

    // 2. Send USDC (Base Sepolia)
    const txHash = await sendUSDC(wallet.address, purchase.totalUSD);
    console.log(`✅ USDC sent: ${txHash}`);

    // 3. Send 10% reward (gasless)
    const rewardAmount = purchase.totalUSD * 0.1;
    const rewardTxHash = await sendReward(wallet.address, rewardAmount);
    console.log(`✅ Reward sent: ${rewardTxHash}`);

    // 4. Get wallet link token
    const walletLinkToken = getWalletLinkToken(email);

    // 5. Send email
    await sendPaymentEmail({
      to: email,
      purchaseId,
      sku: purchase.sku,
      qty: purchase.qty,
      totalUSD: purchase.totalUSD,
      txHash,
      rewardTxHash,
      walletLinkToken,
    });
    console.log(`✅ Email sent to ${email}`);

    // Mark as paid
    markPurchaseAsPaid(purchaseId);

    const response: PayResponse = {
      success: true,
      txHash,
      rewardTxHash,
      walletLinkToken,
      message: "Payment successful! Check your email.",
    };

    res.json(response);
  } catch (error) {
    console.error("Error in /pay:", error);
    res.status(500).json({ 
      error: "Payment failed", 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

export default router;
