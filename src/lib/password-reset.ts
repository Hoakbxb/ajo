import { createHash, randomBytes } from "crypto";
import { PASSWORD_RESET_TOKEN_TTL_MS } from "@/lib/constants";

export function createPasswordResetTokenValue(): string {
  return randomBytes(32).toString("hex");
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getPasswordResetExpiry(): Date {
  return new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
}

export function buildPasswordResetUrl(token: string, siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}
