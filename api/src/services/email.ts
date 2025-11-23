import sgMail from "@sendgrid/mail";

// SendGrid API key設定
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

/**
 * 汎用メール送信関数
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}) {
  const msg = {
    to: options.to,
    from: process.env.SENDGRID_FROM_EMAIL || "no-reply@sendgrid.arkt.me",
    subject: options.subject,
    html: options.html,
  };

  try {
    await sgMail.send(msg);
    console.log(`📧 Email sent to ${options.to} via SendGrid`);
  } catch (error: any) {
    console.error("SendGrid send error:", error.response?.body || error);
    throw error;
  }
}
