"use client";

import { useState } from "react";
import {
  useSignInWithEmail,
  useVerifyEmailOTP,
  useIsSignedIn,
  useEvmAddress,
  useSendEvmTransaction,
} from "@coinbase/cdp-hooks";
import { parseUnits } from "viem";

const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;

const ERC20_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

interface Props {
  purchaseId: string;
  email: string;
  priceUsd: number;
}

export default function PayWithCrypto({ purchaseId, email: initialEmail, priceUsd }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [flowId, setFlowId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [paying, setPaying] = useState(false);

  const signIn = useSignInWithEmail();
  const verifyOtp = useVerifyEmailOTP();
  const isSignedIn = useIsSignedIn();
  const evmAddress = useEvmAddress();
  const { sendEvmTransaction } = useSendEvmTransaction();

  async function startEmailLogin() {
    setStatus("Sending OTP...");
    try {
      const result = await signIn(email);
      setFlowId(result.flowId);
      setStatus("OTP sent to your email");
    } catch (err) {
      setStatus("Failed to send OTP");
      console.error(err);
    }
  }

  async function finishEmailLogin() {
    if (!flowId) return;
    setStatus("Verifying OTP...");
    try {
      await verifyOtp({ flowId, otp });
      setStatus("Signed in successfully!");
    } catch (err) {
      setStatus("Invalid OTP");
      console.error(err);
    }
  }

  async function payUsdc() {
    if (!evmAddress) {
      setStatus("Wallet not ready");
      return;
    }

    setPaying(true);
    setStatus("Getting merchant address...");

    try {
      // 1) Merchant address取得
      const merchantRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/merchant-address`);
      const { merchantAddress } = await merchantRes.json();

      // 2) USDC送金（Embedded Walletで署名 - CDP hooks使用）
      setStatus("Preparing transaction...");

      const amount = parseUnits(String(priceUsd), 6); // USDC 6 decimals

      setStatus("Please confirm transaction in your wallet...");
      
      // CDP SDK経由でEmbedded Walletから送金
      const result = await sendEvmTransaction({
        evmAccount: evmAddress,
        transaction: {
          to: USDC_BASE_SEPOLIA,
          data: `0xa9059cbb${merchantAddress.slice(2).padStart(64, '0')}${amount.toString(16).padStart(64, '0')}`, // transfer(address,uint256)
          gas: 100000n,
          chainId: 84532, // Base Sepolia
          type: "eip1559",
        },
        network: "base-sepolia",
      });

      const txHash = result.transactionHash;
      setStatus(`Payment sent! Tx: ${txHash.slice(0, 10)}...`);

      // 3) Backend に通知
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseId,
          email,
          userAddress: evmAddress,
          txHash,
        }),
      });

      setStatus("✅ Payment complete! Check your email for reward claim link.");
      
    } catch (err: any) {
      console.error("Payment error:", err);
      setStatus(`Payment failed: ${err.message}`);
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="card">
      <h2>💰 Pay with Crypto (USDC)</h2>
      
      {!isSignedIn ? (
        <div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>
          
          <button onClick={startEmailLogin} className="button">
            Send OTP
          </button>

          {flowId && (
            <>
              <div className="form-group" style={{ marginTop: '20px' }}>
                <label>Enter OTP Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                />
              </div>
              <button onClick={finishEmailLogin} className="button">
                Verify OTP
              </button>
            </>
          )}
        </div>
      ) : (
        <div>
          <p><strong>Wallet:</strong> {evmAddress?.slice(0, 6)}...{evmAddress?.slice(-4)}</p>
          <p><strong>Amount:</strong> {priceUsd} USDC</p>
          
          <button
            onClick={payUsdc}
            disabled={paying}
            className="button"
            style={{ width: '100%', marginTop: '20px' }}
          >
            {paying ? "Processing..." : `Pay ${priceUsd} USDC`}
          </button>
        </div>
      )}

      {status && (
        <div style={{
          marginTop: '20px',
          padding: '12px',
          background: '#f0f0f0',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          {status}
        </div>
      )}
    </div>
  );
}
