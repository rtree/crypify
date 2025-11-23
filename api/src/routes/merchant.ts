import { Router } from "express";
import { getMerchantWallet } from "../lib/cdp";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const merchant = await getMerchantWallet();
    
    res.json({
      merchantAddress: merchant.address
    });
  } catch (err) {
    console.error("Get merchant address error:", err);
    res.status(500).json({ error: "Failed to get merchant address" });
  }
});

export default router;
