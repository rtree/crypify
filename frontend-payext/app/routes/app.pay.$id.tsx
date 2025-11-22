/**
 * Payment Page - Crypto Payment Processing
 * 
 * Simplified version for initial testing.
 * OnchainKit integration will be added after basic flow is working.
 */

import { useState } from "react";
import { redirect, type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const { paymentId } = params;

  if (!paymentId) {
    throw new Response("Payment ID is required", { status: 400 });
  }

  // Fetch payment session from database
  const paymentSession = await db.paymentSession.findUnique({
    where: { sessionId: paymentId },
  });

  if (!paymentSession) {
    throw new Response("Payment session not found", { status: 404 });
  }

  // Check if payment is already completed
  if (paymentSession.status === "completed") {
    return redirect(paymentSession.cancelUrl || "https://shopify.com");
  }

  return Response.json({
    paymentId,
    amount: paymentSession.amount,
    currency: paymentSession.currency,
    cancelUrl: paymentSession.cancelUrl,
    customerEmail: paymentSession.customerEmail,
  });
};

export default function PaymentPage() {
  const { paymentId, amount, currency, cancelUrl, customerEmail } =
    useLoaderData<typeof loader>();

  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [txHash, setTxHash] = useState<string>("");

  const handlePayment = async () => {
    try {
      setPaymentStatus("processing");

      // Simulate transaction (will be replaced with actual USDC transfer)
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const mockTxHash =
        "0x" + Math.random().toString(16).substring(2, 66).padEnd(64, "0");

      setTxHash(mockTxHash);

      // Call API to resolve payment session
      const response = await fetch("/api/payment/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentId,
          txHash: mockTxHash,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to resolve payment session");
      }

      setPaymentStatus("success");

      // Redirect back to Shopify after 2 seconds
      setTimeout(() => {
        window.location.href = cancelUrl || "https://shopify.com";
      }, 2000);
    } catch (error) {
      console.error("Payment error:", error);
      setPaymentStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Payment failed"
      );
    }
  };

  const handleCancel = () => {
    window.location.href = cancelUrl || "https://shopify.com";
  };

  return (
    <div style={{ maxWidth: "600px", margin: "50px auto", padding: "20px" }}>
      <h1>Complete Your Payment</h1>

      {paymentStatus === "error" && (
        <div style={{ 
          padding: "15px", 
          marginBottom: "20px", 
          backgroundColor: "#fee", 
          border: "1px solid #fcc",
          borderRadius: "4px"
        }}>
          <strong>Payment Error</strong>
          <p>{errorMessage}</p>
        </div>
      )}

      {paymentStatus === "success" && (
        <div style={{ 
          padding: "15px", 
          marginBottom: "20px", 
          backgroundColor: "#efe", 
          border: "1px solid #cfc",
          borderRadius: "4px"
        }}>
          <strong>Payment Successful!</strong>
          <p>Your payment has been processed successfully. Redirecting you back to the store...</p>
          {txHash && (
            <p>
              Transaction:{" "}
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {txHash.substring(0, 10)}...
              </a>
            </p>
          )}
        </div>
      )}

      <div style={{ 
        padding: "20px", 
        border: "1px solid #ddd", 
        borderRadius: "8px",
        marginBottom: "20px"
      }}>
        <h2>Pay with Crypto (USDC on Base)</h2>

        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          margin: "20px 0",
          fontSize: "18px"
        }}>
          <span>Total Amount:</span>
          <strong>${amount} {currency}</strong>
        </div>

        {customerEmail && (
          <p style={{ color: "#666", fontSize: "14px" }}>
            Email: {customerEmail}
          </p>
        )}

        <div style={{ marginTop: "30px" }}>
          <p style={{ color: "#666", fontSize: "14px", marginBottom: "15px" }}>
            OnchainKit wallet integration will be added here
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            onClick={handlePayment}
            disabled={paymentStatus === "processing" || paymentStatus === "success"}
            style={{
              padding: "12px 24px",
              backgroundColor: paymentStatus === "processing" ? "#ccc" : "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: paymentStatus === "processing" ? "not-allowed" : "pointer",
              fontSize: "16px",
              flex: 1
            }}
          >
            {paymentStatus === "processing" ? "Processing..." : "Pay Now"}
          </button>
          <button
            onClick={handleCancel}
            disabled={paymentStatus === "processing"}
            style={{
              padding: "12px 24px",
              backgroundColor: "#fff",
              color: "#333",
              border: "1px solid #ddd",
              borderRadius: "4px",
              cursor: paymentStatus === "processing" ? "not-allowed" : "pointer",
              fontSize: "16px"
            }}
          >
            Cancel
          </button>
        </div>

        <p style={{ 
          color: "#666", 
          fontSize: "12px", 
          marginTop: "20px",
          fontStyle: "italic"
        }}>
          You will be charged in USDC on the Base network. Make sure you have sufficient USDC balance in your wallet.
        </p>
      </div>
    </div>
  );
}
