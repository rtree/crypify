"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useSignInWithEmail, useVerifyEmailOTP, useCurrentUser, useEvmAddress } from "@coinbase/cdp-hooks";

export default function ClaimWithAuth() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const { signInWithEmail } = useSignInWithEmail();
  const { verifyEmailOTP } = useVerifyEmailOTP();
  const { currentUser } = useCurrentUser();
  const { evmAddress } = useEvmAddress();

  const [step, setStep] = useState<"checking" | "email" | "otp" | "claiming" | "success" | "error">("checking");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [flowId, setFlowId] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [tokenEmail, setTokenEmail] = useState("");

  // トークンからメールアドレスを取得
  useEffect(() => {
    if (!token) {
      setError("Invalid claim link");
      setStep("error");
      return;
    }

    try {
      const [b64] = token.split(".");
      const payload = JSON.parse(atob(b64));
      setTokenEmail(payload.email || "");
      setEmail(payload.email || "");
    } catch (err) {
      setError("Invalid claim token format");
      setStep("error");
      return;
    }

    // 既にサインイン済みかチェック
    checkAuthStatus();
  }, [token]);

  // 認証状態をチェック
  async function checkAuthStatus() {
    if (currentUser && evmAddress) {
      console.log("✅ Already signed in, claiming directly...");
      await executeClaim(evmAddress);
    } else {
      console.log("⚠️ Not signed in, need email authentication");
      setStep("email");
    }
  }

  // Step 1: メール認証開始
  async function handleSendOTP() {
    if (!email) {
      setError("Please enter your email");
      return;
    }

    // 既にサインイン済みの場合は直接Claim実行
    if (currentUser && evmAddress) {
      console.log("✅ Already signed in, skipping OTP");
      await executeClaim(evmAddress);
      return;
    }

    try {
      setError("");
      console.log("📧 Sending OTP to:", email);
      const result = await signInWithEmail({ email });
      setFlowId(result.flowId);
      setStep("otp");
      console.log("✅ OTP sent! flowId:", result.flowId);
    } catch (err: any) {
      console.error("❌ Failed to send OTP:", err);
      setError(err.message || "Failed to send OTP");
    }
  }

  // Step 2: OTP検証
  async function handleVerifyOTP() {
    if (!otp || otp.length !== 6) {
      setError("Please enter 6-digit OTP");
      return;
    }

    try {
      setError("");
      console.log("🔐 Verifying OTP...", { flowId, otp });
      
      const { user, isNewUser } = await verifyEmailOTP({ flowId, otp });
      
      console.log("✅ OTP verified!", { 
        isNewUser, 
        evmAccounts: user.evmAccounts,
        userId: user.userId 
      });

      // EVMアドレス取得
      const userAddress = user.evmAccounts?.[0];
      if (!userAddress) {
        throw new Error("No EVM address found");
      }

      if (isNewUser) {
        console.log("🆕 New user! Wallet created:", userAddress);
        // 新規ユーザーの場合、0.001 ETHをファンド
        await fundNewWallet(userAddress);
      } else {
        console.log("👤 Existing user, wallet:", userAddress);
      }

      // Claim実行
      await executeClaim(userAddress);
    } catch (err: any) {
      console.error("❌ Failed to verify OTP:", err);
      setError(err.message || "Failed to verify OTP");
    }
  }

  // 新規ウォレットに0.001 ETHをファンド
  async function fundNewWallet(address: string) {
    try {
      console.log("💰 Funding new wallet with 0.001 ETH...", address);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/fund-wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, amount: "0.001" })
      });

      if (!res.ok) {
        console.warn("⚠️ Failed to fund wallet (non-blocking)");
      } else {
        const data = await res.json();
        console.log("✅ Wallet funded:", data);
      }
    } catch (err) {
      console.warn("⚠️ Fund wallet error (non-blocking):", err);
    }
  }

  // Claim実行
  async function executeClaim(userAddress: string) {
    setStep("claiming");

    try {
      console.log("🎁 Claiming reward...", { token, userAddress });
      
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/claim?token=${encodeURIComponent(token!)}&userAddress=${encodeURIComponent(userAddress)}`
      );
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Claim failed");
      }
      
      const data = await res.json();
      console.log("✅ Claim successful!", data);
      setResult(data);
      setStep("success");
    } catch (err: any) {
      console.error("❌ Claim failed:", err);
      setError(err.message);
      setStep("error");
    }
  }

  // Step: checking
  if (step === "checking") {
    return (
      <div className="container">
        <div className="card">
          <div className="loading">🔍 Checking authentication status...</div>
        </div>
      </div>
    );
  }

  // Step: email input
  if (step === "email") {
    return (
      <div className="container">
        <div className="card">
          <h1 style={{ fontSize: '32px', marginBottom: '20px', textAlign: 'center' }}>
            🎁 Claim Your Reward
          </h1>

          <p style={{ marginBottom: '24px', textAlign: 'center', color: '#666' }}>
            Enter your email to verify and claim your USDC reward
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSendOTP()}
            />
          </div>

          {error && (
            <div className="error" style={{ marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSendOTP}
            className="button"
            style={{ width: '100%' }}
          >
            {currentUser && evmAddress ? 'Claim Your Reward 🎁' : 'Send Verification Code 📧'}
          </button>

          {tokenEmail && (
            <p style={{ marginTop: '16px', fontSize: '14px', color: '#666', textAlign: 'center' }}>
              💡 Claim link sent to: <strong>{tokenEmail}</strong>
            </p>
          )}
        </div>
      </div>
    );
  }

  // Step: OTP verification
  if (step === "otp") {
    return (
      <div className="container">
        <div className="card">
          <h1 style={{ fontSize: '32px', marginBottom: '20px', textAlign: 'center' }}>
            🔐 Verify Your Email
          </h1>

          <p style={{ marginBottom: '24px', textAlign: 'center', color: '#666' }}>
            We sent a 6-digit code to <strong>{email}</strong>
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Verification Code
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '24px',
                letterSpacing: '8px',
                textAlign: 'center',
                fontWeight: '600'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleVerifyOTP()}
            />
          </div>

          {error && (
            <div className="error" style={{ marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleVerifyOTP}
            className="button"
            style={{ width: '100%', marginBottom: '12px' }}
            disabled={otp.length !== 6}
          >
            Verify & Claim Reward 🎁
          </button>

          <button
            onClick={() => setStep("email")}
            style={{
              width: '100%',
              padding: '12px',
              background: 'transparent',
              border: '1px solid #ddd',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#666'
            }}
          >
            ← Back to Email
          </button>
        </div>
      </div>
    );
  }

  // Step: claiming
  if (step === "claiming") {
    return (
      <div className="container">
        <div className="card">
          <div className="loading">🎁 Claiming your USDC reward...</div>
        </div>
      </div>
    );
  }

  // Step: error
  if (step === "error") {
    return (
      <div className="container">
        <div className="card">
          <h1 style={{ fontSize: '32px', marginBottom: '20px', textAlign: 'center' }}>
            ❌ Claim Failed
          </h1>
          <div className="error">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="button"
            style={{ width: '100%', marginTop: '16px' }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Step: success
  if (step === "success" && result) {
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

          <a href="/" className="button" style={{ width: '100%', textAlign: 'center', display: 'block' }}>
            Shop More 🛍️
          </a>
        </div>
      </div>
    );
  }

  return null;
}

