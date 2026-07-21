import { TOTP, Secret } from "otpauth";
import QRCode from "qrcode";
import crypto from "node:crypto";
import { encryptSecret, decryptSecret } from "@/lib/db-config";

const ISSUER = "Memorial do Jornal";

/**
 * MFA (TOTP) building blocks — schema and helpers are in place, but no login
 * flow wires them up yet. A future enrollment screen would: generate a
 * secret, show the QR code, verify one code before turning mfaEnabled on;
 * a future login step would call verifyTotpToken/verifyBackupCode after the
 * password check succeeds.
 */

export function generateMfaSecret(): string {
  return new Secret({ size: 20 }).base32;
}

function buildTotp(secretBase32: string, accountLabel: string): TOTP {
  return new TOTP({
    issuer: ISSUER,
    label: accountLabel,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secretBase32),
  });
}

export function getProvisioningUri(secretBase32: string, accountLabel: string): string {
  return buildTotp(secretBase32, accountLabel).toString();
}

export async function getProvisioningQrCodeDataUrl(
  secretBase32: string,
  accountLabel: string
): Promise<string> {
  return QRCode.toDataURL(getProvisioningUri(secretBase32, accountLabel));
}

/** Validates a 6-digit TOTP code, allowing 1 step of clock drift either way. */
export function verifyTotpToken(secretBase32: string, token: string): boolean {
  const delta = buildTotp(secretBase32, "verify").validate({ token, window: 1 });
  return delta !== null;
}

export function encryptMfaSecret(secretBase32: string): string {
  return encryptSecret(secretBase32);
}

export function decryptMfaSecret(encrypted: string): string {
  return decryptSecret(encrypted);
}

const BACKUP_CODE_COUNT = 10;

/** Returns plaintext codes (to show once) plus their sha256 hashes (to store as JSON). */
export function generateBackupCodes(): { codes: string[]; hashes: string[] } {
  const codes: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = crypto.randomBytes(5).toString("hex"); // 10 hex chars
    codes.push(code);
    hashes.push(crypto.createHash("sha256").update(code).digest("hex"));
  }
  return { codes, hashes };
}

export function verifyBackupCode(code: string, storedHashesJson: string): string[] | null {
  const hashes: string[] = JSON.parse(storedHashesJson);
  const hash = crypto.createHash("sha256").update(code.trim()).digest("hex");
  const index = hashes.indexOf(hash);
  if (index === -1) return null;
  // Return the remaining codes (one-time use — consumed codes are removed).
  return [...hashes.slice(0, index), ...hashes.slice(index + 1)];
}
