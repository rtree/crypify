import { Router } from "express";
import crypto from "crypto";

const router = Router();

// In-memory storage (Cloud Run再起動で消える = MVP許容)
const purchases = new Map();

router.get("/", (req, res) => {
  const { product, price, email } = req.query;
  
  if (!product || !price || !email) {
    return res.status(400).json({ error: "Missing required parameters" });
  }
  
  const purchaseId = `PUR-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const priceUsd = Number(price);
  
  purchases.set(purchaseId, {
    product,
    priceUsd,
    email,
    createdAt: Date.now()
  });
  
  const redirectUrl = `${process.env.FRONTEND_URL}/thanks?purchaseId=${purchaseId}&email=${encodeURIComponent(String(email))}`;
  
  res.json({
    purchaseId,
    product,
    priceUsd,
    email,
    redirectUrl
  });
});

export { purchases }; // Pay endpointで参照
export default router;
