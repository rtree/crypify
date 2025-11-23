"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  useSignInWithEmail,
  useVerifyEmailOTP,
  useIsSignedIn,
  useEvmAddress,
  useCurrentUser,
} from "@coinbase/cdp-hooks";

export default function ClaimWithAuth() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"verify-email" | "verify-otp" | "claiming" | "done">("verify-email");
  
  // Email OTP認証
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [flowId, setFlowId] = useState<string | null>(null);
  
  const { signInWithEmail } = useSignInWithEmail();
  const { verifyEmailOTP } = useVerifyEmailOTP();
  const { isSignedIn } = useIsSignedIn();
  const { evmAddress } = useEvmAddress();
  const { currentUser } = useCurrentUser();

  // トークンがない場合
  useEffect(() => {
    if (!token) {
      setError("Invalid claim link");
    }
  }, [token]);

  // サインイン済みなら自動でClaimを実行
  useEffect(() => {
    if (isSignedIn && evmAddress && token && step === "claiming") {
      executeClaim();
    }
  }, [isSignedIn, evmAddress, token, step]);

  // Step 1: メールアドレス送信
  async function handleSendOTP() {
    if (!email || !token) return;
    
    setLoading(true);
    try {
      const result = await signInWithEmail({ email });
      setFlowId(result.flowId);
      setStep("verify-otp");
      setError("");
    } catch (err: any) {
      setError(`Failed to send OTP: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  // Step 2: OTP検証
  async function handleVerifyOTP() {
    if (!flowId || !otp) return;
    
    setLoading(true);
    try {
      const { user, isNewUser } = await verifyEmailOTP({ flowId, otp });
      
      console.log("✅ Signed in!", { 
        isNewUser, 
        evmAccounts: user.evmAccounts
      });
      
      setStep("claiming");
      setError("");
      
      // 新規ユーザーの場合、Wallet作成完了を待つ
      if (isNewUser) {
        await fundNewWallet(user.evmAccounts?.[0]);
      }
      
    } catch (err: any) {
      setError(`OTP verification failed: ${err.message}`);
      setLoading(false);
    }
  }

  // Step 3: 新規Walletに初期資金を提供（Base Sepolia ETH）
  async function fundNewWallet(address: string | undefined) {
    if (!address) return;
    
    try {
      console.log("🔋 Funding new wallet with 0.001 ETH...", address);
      
      // CDP Faucet API経由で0.001 ETH付与
      // Note: これはバックエンド経由で実行する必要があります
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/fund-wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, amount: "0.001" }),
      });
      
      console.log("✅ Wallet funded successfully!");
    } catch (err) {
      console.warn("⚠️ Failed to fund wallet (continuing anyway):", err);
    }
  }

  // Step 4: Claim実行
  async function executeClaim() {
    if (!token || !evmAddress) return;
    
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/claim?token=${encodeURIComponent(token)}&userAddress=${evmAddress}`
      );
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Claim failed");
      }
      
      const data = await res.json();
      setResult(data);
      setStep("done");
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Error画面
  if (error && !token) {
    return (
      <div className="container">
        <div className="card">
          <div className="error">{error}</div>
        </div>
      </div>
    );
  }

  // 成功画面
  if (step === "done" && result) {
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

  // メール入力画面
  if (step === "verify-email") {
    return (
      <div className="container">
        <div className="card">
          <h1 style={{ fontSize: '32px', marginBottom: '20px', textAlign: 'center' }}>
            🎁 Claim Your Reward
          </h1>

          <p style={{ marginBottom: '24px', textAlign: 'center', color: '#666' }}>
            Enter your email to verify and receive your USDC reward
          </p>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={loading}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              background: '#fee',
              borderRadius: '4px',
              color: '#c00',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          <button 
            onClick={handleSendOTP} 
            disabled={loading || !email}
            className="button"
            style={{ width: '100%' }}
          >
            {loading ? "Sending..." : "Send Verification Code"}
          </button>
        </div>
      </div>
    );
  }

  // OTP入力画面
  if (step === "verify-otp") {
    return (
      <div className="container">
        <div className="card">
          <h1 style={{ fontSize: '32px', marginBottom: '20px', textAlign: 'center' }}>
            📧 Enter Verification Code
          </h1>

          <p style={{ marginBottom: '24px', textAlign: 'center', color: '#666' }}>
            We sent a 6-digit code to <strong>{email}</strong>
          </p>

          <div className="form-group">
            <label>Verification Code</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              maxLength={6}
              disabled={loading}
              style={{ fontSize: '24px', textAlign: 'center', letterSpacing: '8px' }}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              background: '#fee',
              borderRadius: '4px',
              color: '#c00',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}

          <button 
            onClick={handleVerifyOTP} 
            disabled={loading || otp.length !== 6}
            className="button"
            style={{ width: '100%' }}
          >
            {loading ? "Verifying..." : "Verify & Claim Reward"}
          </button>

          <button
            onClick={() => setStep("verify-email")}
            disabled={loading}
            style={{
              marginTop: '12px',
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: '#667eea',
              cursor: 'pointer'
            }}
          >
            ← Change Email
          </button>
        </div>
      </div>
    );
  }

  // Claiming画面
  if (step === "claiming") {
    return (
      <div className="container">
        <div className="card">
          <div className="loading" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
            <h2>Claiming your reward...</h2>
            <p style={{ color: '#666', marginTop: '12px' }}>
              This may take a few seconds
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
