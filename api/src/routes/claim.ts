import { Router } from "express";
import { verifyClaimToken } from "../lib/claimToken";
import { getMerchantWallet } from "../lib/cdp";

const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const token = String(req.query.token || "");
    const userAddressFromQuery = req.query.userAddress as string | undefined;
    
    // Token検証（HMAC）
    const payload = verifyClaimToken(token);
    const { userAddress: tokenUserAddress, rewardUsd, expiresAt, email } = payload;
    
    // userAddressはクエリパラメータ優先（Embedded Wallet作成後）
    const userAddress = userAddressFromQuery || tokenUserAddress;
    
    // 期限チェック
    if (Date.now() > expiresAt) {
      return res.status(410).json({ error: "Claim link expired" });
    }
    
    // Merchant Server Walletから gasless transfer
    const merchant = await getMerchantWallet();
    
    // CDP SDK v2のtransferメソッド使用（USDC = 6 decimals）
    const amountInSmallestUnit = Math.floor(Number(rewardUsd) * 1_000_000); // USDC has 6 decimals
    
    const tx = await merchant.transfer({
      to: userAddress as `0x${string}`,
      amount: BigInt(amountInSmallestUnit),
      token: "usdc",
      network: "base-sepolia",
    });
    
    const txHash = tx.transactionHash;
    
    console.log(`✅ Reward claimed: ${rewardUsd} USDC to ${userAddress} (tx: ${txHash})`);
    
    res.json({
      success: true,
      email,
      userAddress,
      rewardUsd,
      txHash,
      message: `${rewardUsd} USDC claimed successfully!`
    });
    
  } catch (err: any) {
    console.error("Claim error:", err);
    
    if (err.message === "Invalid signature") {
      return res.status(400).json({ error: "Invalid or tampered claim link" });
    }
    
    res.status(500).json({ error: "Failed to claim reward" });
  }
});

export default router;
