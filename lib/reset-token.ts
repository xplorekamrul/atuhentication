// /lib/reset-token.ts
import crypto from "crypto";

const SECRET = process.env.RESET_TOKEN_SECRET ?? "dev-secret";
const TTL_MIN = Number(process.env.RESET_TOKEN_TTL_MIN ?? 15);

type Payload = { email: string; exp: number };

// url-safe base64
function b64urlEncode(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
function b64urlDecode(str: string) {
  // restore padding
  const pad = 4 - (str.length % 4);
  const padded = str + (pad < 4 ? "=".repeat(pad) : "");
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64");
}

function timingSafeEq(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function signResetToken(email: string) {
  const payload: Payload = { email, exp: Date.now() + TTL_MIN * 60_000 };
  const body = Buffer.from(JSON.stringify(payload));
  const bodyB64 = b64urlEncode(body);

  const sig = crypto.createHmac("sha256", SECRET).update(body).digest();
  const sigB64 = b64urlEncode(sig);

  return `${bodyB64}.${sigB64}`;
}

export function verifyResetToken(token: string): Payload | null {
  const [bodyB64, sigB64] = token.split(".");
  if (!bodyB64 || !sigB64) return null;

  const bodyBuf = b64urlDecode(bodyB64);
  let payload: Payload;
  try {
    payload = JSON.parse(bodyBuf.toString("utf8"));
  } catch {
    return null;
  }

  const expectedSig = crypto.createHmac("sha256", SECRET).update(bodyBuf).digest();
  const expectedB64 = b64urlEncode(expectedSig);

  if (!timingSafeEq(expectedB64, sigB64)) return null;
  if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;

  return payload;
}
