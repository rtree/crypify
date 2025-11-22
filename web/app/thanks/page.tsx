"use client";

import { Suspense } from "react";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { pay } from "@/lib/api";

function ThanksContent() {
  const searchParams = useSearchParams();
  const purchaseId = searchParams.get("purchaseId");
  const email = searchParams.get("email");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handlePay = async () => {
    if (!purchaseId || !email) {
      setError("Missing purchase information");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const paymentResult = await pay({ purchaseId, email });
      setResult(paymentResult);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  if (!purchaseId || !email) {
    return (
      <div className="container">
        <div className="card">
          <div className="error">Invalid purchase information</div>
        </div>
      </div>
    );
  }

  if (success && result) {
    return (
      <div className="container">
        <div className="card">
          <h1 style={{ fontSize: '36px', marginBottom: '20px', textAlign: 'center' }}>
            🎉 Payment Successful!
          </h1>

          <div className="success">
            {result.message}
          </div>

          <div style={{ background: '#f9f9f9', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Transaction Details</h3>
            
            <p style={{ marginBottom: '12px', wordBreak: 'break-all' }}>
              <strong>Payment TX:</strong><br />
              <a 
                href={`https://sepolia.basescan.org/tx/${result.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#667eea' }}
              >
                {result.txHash}
              </a>
            </p>

            <p style={{ marginBottom: '12px', wordBreak: 'break-all' }}>
              <strong>Reward TX (10%):</strong><br />
              <a 
                href={`https://sepolia.basescan.org/tx/${result.rewardTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#667eea' }}
              >
                {result.rewardTxHash}
              </a>
            </p>
          </div>

          <p style={{ marginBottom: '24px', textAlign: 'center', color: '#666' }}>
            📧 Check your email for wallet access link!
          </p>

          <a 
            href={`/wallet?token=${result.walletLinkToken}`}
            className="button"
            style={{ width: '100%', textAlign: 'center', display: 'block' }}
          >
            View Your Wallet 🔗
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h1 style={{ fontSize: '36px', marginBottom: '20px', textAlign: 'center' }}>
          💳 Complete Payment
        </h1>

        <p style={{ marginBottom: '24px', textAlign: 'center', color: '#666' }}>
          Purchase ID: <strong>{purchaseId}</strong>
        </p>

        {error && <div className="error">{error}</div>}

        <div style={{ background: '#f9f9f9', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '12px' }}>What happens next?</h3>
          <ul style={{ paddingLeft: '24px', lineHeight: '1.8' }}>
            <li>We'll create a crypto wallet for you</li>
            <li>Send USDC payment to your wallet (Base Sepolia testnet)</li>
            <li>Add 10% reward (gasless transaction)</li>
            <li>Email you the wallet access link</li>
          </ul>
        </div>

        <button
          onClick={handlePay}
          className="button"
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? "Processing Payment..." : "Pay with Crypto 🚀"}
        </button>
      </div>
    </div>
  );
}

export default function ThanksPage() {
  return (
    <Suspense fallback={
      <div className="container">
        <div className="card">
          <div className="loading">Loading...</div>
        </div>
      </div>
    }>
      <ThanksContent />
    </Suspense>
  );
}
