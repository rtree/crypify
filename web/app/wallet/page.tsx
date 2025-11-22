"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { fetchWallet, WalletResponse } from "@/lib/api";

export default function WalletPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wallet, setWallet] = useState<WalletResponse | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Missing wallet token");
      setLoading(false);
      return;
    }

    loadWallet();
  }, [token]);

  const loadWallet = async () => {
    if (!token) return;

    try {
      const data = await fetchWallet(token);
      setWallet(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <div className="loading">Loading wallet...</div>
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

  if (!wallet) {
    return (
      <div className="container">
        <div className="card">
          <div className="error">Wallet not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <h1 style={{ fontSize: '36px', marginBottom: '30px', textAlign: 'center' }}>
          💼 Your Wallet
        </h1>

        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '32px', borderRadius: '12px', marginBottom: '32px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Total Balance</p>
          <p style={{ fontSize: '48px', fontWeight: 'bold' }}>${wallet.balance}</p>
          <p style={{ fontSize: '14px', opacity: 0.9', marginTop: '8px' }}>USDC</p>
        </div>

        <div style={{ background: '#f9f9f9', padding: '24px', borderRadius: '8px', marginBottom: '32px' }}>
          <h3 style={{ marginBottom: '16px' }}>Wallet Info</h3>
          
          <p style={{ marginBottom: '12px', wordBreak: 'break-all' }}>
            <strong>Email:</strong><br />
            {wallet.email}
          </p>

          <p style={{ marginBottom: '12px', wordBreak: 'break-all' }}>
            <strong>Address:</strong><br />
            <a 
              href={`https://sepolia.basescan.org/address/${wallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#667eea' }}
            >
              {wallet.address}
            </a>
          </p>
        </div>

        <h3 style={{ marginBottom: '16px' }}>Reward History</h3>
        
        {wallet.rewardHistory.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center', padding: '24px' }}>
            No rewards yet
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {wallet.rewardHistory.map((reward, idx) => (
              <div 
                key={idx}
                style={{ 
                  background: '#f9f9f9', 
                  padding: '16px', 
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <p style={{ fontWeight: '600', marginBottom: '4px' }}>
                    +${reward.amount} USDC
                  </p>
                  <p style={{ fontSize: '14px', color: '#666' }}>
                    {new Date(reward.timestamp).toLocaleString()}
                  </p>
                </div>
                <a 
                  href={`https://sepolia.basescan.org/tx/${reward.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#667eea', fontSize: '14px' }}
                >
                  View TX ↗
                </a>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <a href="/shop" className="button">
            Shop More 🛍️
          </a>
        </div>
      </div>
    </div>
  );
}
