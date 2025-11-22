"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPurchase } from "@/lib/api";

const PRODUCTS = [
  { sku: "hoodie", name: "Crypify Hoodie", price: 50, emoji: "👕" },
  { sku: "tshirt", name: "Crypify T-Shirt", price: 25, emoji: "👔" },
  { sku: "cap", name: "Crypify Cap", price: 15, emoji: "🧢" },
];

export default function ShopPage() {
  const router = useRouter();
  const [selectedSku, setSelectedSku] = useState("hoodie");
  const [qty, setQty] = useState(1);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedProduct = PRODUCTS.find(p => p.sku === selectedSku)!;
  const total = selectedProduct.price * qty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await createPurchase({ sku: selectedSku, qty, email });
      // Redirect to thanks page with purchaseId and email
      router.push(`/thanks?purchaseId=${result.purchaseId}&email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1 style={{ fontSize: '36px', marginBottom: '30px', textAlign: 'center' }}>
          🛍️ Shop
        </h1>

        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Product</label>
            <select value={selectedSku} onChange={(e) => setSelectedSku(e.target.value)}>
              {PRODUCTS.map(p => (
                <option key={p.sku} value={p.sku}>
                  {p.emoji} {p.name} - ${p.price}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Quantity</label>
            <input
              type="number"
              min="1"
              max="10"
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ 
            background: '#f5f5f5', 
            padding: '20px', 
            borderRadius: '8px', 
            marginBottom: '24px',
            fontSize: '18px',
            fontWeight: '600'
          }}>
            Total: ${total.toFixed(2)} USD
          </div>

          <button type="submit" className="button" disabled={loading} style={{ width: '100%' }}>
            {loading ? "Creating Order..." : "Continue to Payment →"}
          </button>
        </form>
      </div>
    </div>
  );
}
