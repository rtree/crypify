"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

function ClaimContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid claim link");
      setLoading(false);
      return;
    }

    claimReward();
  }, [token]);

  async function claimReward() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/claim?token=${encodeURIComponent(token!)}`
      );
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Claim failed");
      }
      
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <div className="loading">Claiming your reward...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="card">
          <div className="error">{error}</div>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="container">
        <div className="card">
          <h1 style={{ fontSize: '36px', marginBottom: '20px', textAlign: 'center' }}>
            🎉 Reward Claimed!
          </h1>

          <div className="success">
            {result.message}
          </div>

          <div style={{ background: '#f9f9f9', padding: '24px', borderRadius: '8px', marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>Transaction Details</h3>
            
            <p style={{ marginBottom: '12px', wordBreak: 'break-all' }}>
              <strong>Email:</strong><br />
              {result.email}
            </p>

            <p style={{ marginBottom: '12px', wordBreak: 'break-all' }}>
              <strong>Wallet Address:</strong><br />
              {result.userAddress}
            </p>

            <p style={{ marginBottom: '12px', wordBreak: 'break-all' }}>
              <strong>Reward Amount:</strong><br />
              {result.rewardUsd} USDC
            </p>

            <p style={{ marginBottom: '12px', wordBreak: 'break-all' }}>
              <strong>Transaction:</strong><br />
              <a 
                href={`https://sepolia.basescan.org/tx/${result.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#667eea' }}
              >
                {result.txHash}
              </a>
            </p>
          </div>

          <a href="/shop" className="button" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
            Shop More 🛍️
          </a>
        </div>
      </div>
    );
  }

  return null;
}

export default function ClaimPage() {
  return (
    <Suspense fallback={
      <div className="container">
        <div className="card">
          <div className="loading">Loading...</div>
        </div>
      </div>
    }>
      <ClaimContent />
    </Suspense>
  );
}
