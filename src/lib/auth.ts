import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

export const SESSION_COOKIE = "memorial_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET não configurado no ambiente");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export type SessionPayload = {
  sub: string;
  username: string;
};

export async function createSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.sub !== "string" || typeof payload.username !== "string") return null;
    return { sub: payload.sub, username: payload.username };
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const MFA_PENDING_COOKIE = "memorial_mfa_pending";
const MFA_PENDING_DURATION_SECONDS = 5 * 60; // 5 minutes

/**
 * Short-lived token for the gap between "password verified" and "MFA code
 * verified" — deliberately separate from the real session cookie so a user
 * mid-MFA-challenge never holds a valid admin session.
 */
export async function createMfaPendingToken(userId: string) {
  return new SignJWT({ sub: userId, purpose: "mfa-pending" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MFA_PENDING_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifyMfaPendingToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (payload.purpose !== "mfa-pending" || typeof payload.sub !== "string") return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export async function setMfaPendingCookie(userId: string) {
  const token = await createMfaPendingToken(userId);
  const store = await cookies();
  store.set(MFA_PENDING_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MFA_PENDING_DURATION_SECONDS,
  });
}

export async function clearMfaPendingCookie() {
  const store = await cookies();
  store.delete(MFA_PENDING_COOKIE);
}

export async function getMfaPendingUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(MFA_PENDING_COOKIE)?.value;
  if (!token) return null;
  return verifyMfaPendingToken(token);
}

/** Generates a random reset token; returns the raw token (sent by email) and its hash (stored in DB). */
export function generatePasswordResetToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

export function hashPasswordResetToken(rawToken: string) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}
