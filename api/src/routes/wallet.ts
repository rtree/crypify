import { Router, Request, Response } from "express";
import { WalletResponse } from "../types";
import { resolveEmailFromToken, getWalletInfo } from "../services/cdp";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;

    if (!token) {
      return res.status(400).json({ error: "Missing token parameter" });
    }

    // Resolve email from token
    const email = resolveEmailFromToken(token);
    if (!email) {
      return res.status(404).json({ error: "Invalid or expired token" });
    }

    // Get wallet info
    const walletInfo = await getWalletInfo(email);
    if (!walletInfo) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    const response: WalletResponse = {
      email: walletInfo.email,
      address: walletInfo.address,
      balance: walletInfo.balance,
      rewardHistory: walletInfo.rewardHistory,
    };

    res.json(response);
  } catch (error) {
    console.error("Error in /wallet:", error);
    res.status(500).json({ 
      error: "Failed to fetch wallet", 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

export { router as walletRouter };
export default router;
