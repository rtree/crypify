import express, { Request, Response } from "express";
import cors from "cors";
import { purchaseRouter } from "./routes/purchase";
import { payRouter } from "./routes/pay";
import { walletRouter } from "./routes/wallet";

const app = express();
app.use(express.json());

// デモなら緩めでOK。後で web のURLに絞る
app.use(cors({ origin: true }));

app.use("/purchase", purchaseRouter);
app.use("/pay", payRouter);
app.use("/wallet", walletRouter);

// Health check
app.get("/", (req: Request, res: Response) => {
  res.json({ status: "ok", service: "crypify-api" });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`🚀 crypify-api listening on port ${port}`);
});
