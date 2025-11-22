import express, { Request, Response } from "express";
import cors from "cors";
import purchaseRoute from "./routes/purchase";
import payRoute from "./routes/pay";
import walletRoute from "./routes/wallet";

const app = express();
app.use(express.json());

// デモなら緩めでOK。後で web のURLに絞る
app.use(cors({ origin: true }));

app.use("/purchase", purchaseRoute);
app.use("/pay", payRoute);
app.use("/wallet", walletRoute);

// Health check
app.get("/", (req: Request, res: Response) => {
  res.json({ status: "ok", service: "crypify-api" });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`🚀 crypify-api listening on port ${port}`);
});
