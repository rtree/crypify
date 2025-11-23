import crypto from "crypto";

const SECRET = process.env.CLAIM_SECRET!; // 長いランダム文字列

export function makeClaimToken(payload: object) {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(b64).digest("base64url");
  return `${b64}.${sig}`;
}

export function verifyClaimToken(token: string) {
  const [b64, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", SECRET).update(b64).digest("base64url");
  if (sig !== expected) throw new Error("Invalid signature");
  const json = Buffer.from(b64, "base64url").toString("utf8");
  return JSON.parse(json);
}
