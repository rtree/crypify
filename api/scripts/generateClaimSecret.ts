/**
 * CLAIM_SECRET生成スクリプト
 * 
 * 実行方法:
 * cd /home/araki/crypify/api
 * npx tsx scripts/generateClaimSecret.ts
 */

import crypto from "crypto";

function main() {
  // 64文字のランダム文字列生成（HMAC署名用）
  const claimSecret = crypto.randomBytes(32).toString("hex");
  
  console.log("🔐 CLAIM_SECRET generated!\n");
  console.log("📋 Save this value to Secret Manager:\n");
  console.log(`CLAIM_SECRET=${claimSecret}`);
  console.log("\n");
  console.log("⚠️  Keep this secret secure! It's used for HMAC claim token signatures.");
}

main();
