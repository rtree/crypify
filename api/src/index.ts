import express, { Request, Response } from "express";
import cors from "cors";
import quickBuyRouter from "./routes/quickBuy";
import merchantRouter from "./routes/merchant";
import payRouter from "./routes/pay";
import claimRouter from "./routes/claim";

const app = express();
app.use(express.json());

// デモなら緩めでOK。後で web のURLに絞る
app.use(cors({ origin: true }));

app.use("/quick-buy", quickBuyRouter);
app.use("/merchant-address", merchantRouter);
app.use("/pay", payRouter);
app.use("/claim", claimRouter);

// Health check
app.get("/", (req: Request, res: Response) => {
  res.json({ status: "ok", service: "crypify-api" });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`🚀 crypify-api listening on port ${port}`);
});
