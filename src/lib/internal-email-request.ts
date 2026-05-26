import crypto from 'crypto';
import { NextRequest } from 'next/server';

const SIGNATURE_HEADER = 'x-unigather-email-signature';
const TIMESTAMP_HEADER = 'x-unigather-email-timestamp';
const MAX_SIGNATURE_AGE_MS = 5 * 60 * 1000;

function getSigningSecret() {
  return (
    process.env.INTERNAL_EMAIL_API_SECRET ||
    process.env.RAZORPAY_KEY_SECRET ||
    process.env.FIREBASE_PRIVATE_KEY
  );
}

function signBody(rawBody: string, timestamp: string) {
  const secret = getSigningSecret();
  if (!secret) return null;

  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function createInternalEmailRequestHeaders(rawBody: string) {
  const timestamp = Date.now().toString();
  const signature = signBody(rawBody, timestamp);

  if (!signature) return null;

  return {
    [TIMESTAMP_HEADER]: timestamp,
    [SIGNATURE_HEADER]: signature,
  };
}

export function verifyInternalEmailRequest(request: NextRequest, rawBody: string) {
  const timestamp = request.headers.get(TIMESTAMP_HEADER);
  const signature = request.headers.get(SIGNATURE_HEADER);

  if (!timestamp || !signature) return false;

  const timestampMs = Number(timestamp);
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > MAX_SIGNATURE_AGE_MS) {
    return false;
  }

  const expectedSignature = signBody(rawBody, timestamp);
  return !!expectedSignature && safeEqual(signature, expectedSignature);
}
