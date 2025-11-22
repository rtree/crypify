import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@crypify.app";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

if (!SMTP_USER || !SMTP_PASS) {
  console.warn("⚠️  SMTP credentials not set. Emails will be logged only.");
}

const transporter = SMTP_USER && SMTP_PASS 
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })
  : null;

interface PaymentEmailData {
  to: string;
  purchaseId: string;
  sku: string;
  qty: number;
  totalUSD: number;
  txHash: string;
  rewardTxHash: string;
  walletLinkToken: string;
}

export async function sendPaymentEmail(data: PaymentEmailData): Promise<void> {
  const walletUrl = `${FRONTEND_URL}/wallet?token=${data.walletLinkToken}`;
  const baseSepoliaScan = "https://sepolia.basescan.org/tx";

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    .details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Payment Successful!</h1>
    </div>
    <div class="content">
      <p>Hi there,</p>
      <p>Your purchase has been completed successfully. We've created a crypto wallet for you and sent your USDC payment along with a 10% reward!</p>
      
      <div class="details">
        <h3>Order Details</h3>
        <p><strong>Purchase ID:</strong> ${data.purchaseId}</p>
        <p><strong>Item:</strong> ${data.sku} × ${data.qty}</p>
        <p><strong>Total:</strong> $${data.totalUSD.toFixed(2)} USD</p>
      </div>

      <div class="details">
        <h3>Blockchain Transactions</h3>
        <p><strong>Payment Transaction:</strong><br/>
        <a href="${baseSepoliaScan}/${data.txHash}">${data.txHash.substring(0, 20)}...</a></p>
        <p><strong>Reward Transaction (10%):</strong><br/>
        <a href="${baseSepoliaScan}/${data.rewardTxHash}">${data.rewardTxHash.substring(0, 20)}...</a></p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${walletUrl}" class="button">View Your Wallet 🔗</a>
      </div>

      <p style="color: #666; font-size: 14px;">
        Keep this email safe! You can access your wallet anytime using the link above.
      </p>
    </div>
    <div class="footer">
      <p>Powered by Crypify | Crypto payments made easy</p>
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
Payment Successful!

Your purchase has been completed.

Order Details:
- Purchase ID: ${data.purchaseId}
- Item: ${data.sku} × ${data.qty}
- Total: $${data.totalUSD.toFixed(2)} USD

Blockchain Transactions:
- Payment: ${baseSepoliaScan}/${data.txHash}
- Reward (10%): ${baseSepoliaScan}/${data.rewardTxHash}

View your wallet: ${walletUrl}

Powered by Crypify
  `;

  if (transporter) {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: data.to,
      subject: `✅ Payment Confirmed - ${data.purchaseId}`,
      text: textContent,
      html: htmlContent,
    });
    console.log(`📧 Email sent to ${data.to}`);
  } else {
    console.log(`📧 [MOCK] Email to ${data.to}:`);
    console.log(textContent);
  }
}
