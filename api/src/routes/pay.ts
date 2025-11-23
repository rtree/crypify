import { Router } from "express";
import { purchases } from "./quickBuy";
import { makeClaimToken } from "../lib/claimToken";
import { sendEmail } from "../services/email";

const router = Router();

router.post("/", async (req, res) => {
  const { purchaseId, email, userAddress, txHash } = req.body;
  
  if (!purchaseId || !email || !userAddress || !txHash) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  const purchase = purchases.get(purchaseId);
  if (!purchase) {
    return res.status(404).json({ error: "Purchase not found" });
  }
  
  // 報酬額計算（10%）
  const rewardUsd = (purchase.priceUsd * 0.1).toFixed(2);
  
  // Claim token生成（HMAC署名付き）
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24; // 24h
  const token = makeClaimToken({
    email,
    userAddress,
    rewardUsd,
    purchaseId,
    expiresAt
  });
  
  const claimUrl = `${process.env.FRONTEND_URL}/claim?token=${encodeURIComponent(token)}`;
  
  // メール送信
  try {
    await sendEmail({
      to: email,
      subject: "🎉 You earned USDC rewards!",
      html: `
        <h1>Thanks for your purchase!</h1>
        <p>Payment transaction: <a href="https://sepolia.basescan.org/tx/${txHash}">${txHash.slice(0, 10)}...</a></p>
        <p>You earned <strong>${rewardUsd} USDC</strong> (10% of your purchase)</p>
        <p><a href="${claimUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Claim Your Reward</a></p>
        <p><small>This link expires in 24 hours</small></p>
      `
    });
  } catch (err) {
    console.error("Email send error:", err);
    return res.status(500).json({ error: "Failed to send email" });
  }
  
  res.json({
    success: true,
    rewardUsd,
    claimUrl
  });
});

export default router;
