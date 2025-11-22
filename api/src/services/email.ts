import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@crypify.app";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

if (!SENDGRID_API_KEY) {
  console.warn("⚠️  SENDGRID_API_KEY not set. Emails will be logged only.");
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

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

  if (SENDGRID_API_KEY) {
    try {
      await sgMail.send({
        from: FROM_EMAIL,
        to: data.to,
        subject: `✅ Payment Confirmed - ${data.purchaseId}`,
        text: textContent,
        html: htmlContent,
      });
      console.log(`📧 Email sent to ${data.to} via SendGrid`);
    } catch (error) {
      console.error(`❌ SendGrid error:`, error);
      throw error;
    }
  } else {
    console.log(`📧 [MOCK] Email to ${data.to}:`);
    console.log(textContent);
  }
}
