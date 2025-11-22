export default function HomePage() {
  return (
    <div className="container">
      <div className="card" style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Crypify
        </h1>
        <p style={{ fontSize: '20px', color: '#666', marginBottom: '40px' }}>
          Accept crypto payments and earn rewards
        </p>
        <a href="/shop" className="button" style={{ fontSize: '18px', padding: '16px 40px' }}>
          Shop Now 🛍️
        </a>
      </div>
    </div>
  );
}
