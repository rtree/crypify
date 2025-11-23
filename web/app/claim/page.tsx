import { Suspense } from "react";
import ClaimWithAuth from "./ClaimWithAuth";

export default function ClaimPage() {
  return (
    <Suspense fallback={
      <div className="container">
        <div className="card">
          <div className="loading">Loading...</div>
        </div>
      </div>
    }>
      <ClaimWithAuth />
    </Suspense>
  );
}
