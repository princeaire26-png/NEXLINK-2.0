/**
 * Cryptographic utilities for NEXLINK.
 * 
 * Uses @noble/ed25519 for Ed25519 signature verification.
 * NEVER invent cryptographic primitives.
 */

import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';

// Required for @noble/ed25519
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

/**
 * Verify an Ed25519 signature.
 * 
 * @param message - The message that was signed
 * @param signature - The signature (hex-encoded, 64 bytes = 128 hex chars)
 * @param publicKey - The public key (hex-encoded, 32 bytes = 64 hex chars)
 * @returns true if signature is valid, false otherwise
 */
export function verifyEd25519Signature(
  message: Uint8Array,
  signatureHex: string,
  publicKeyHex: string
): boolean {
  try {
    // Validate input lengths
    if (signatureHex.length !== 128) {
      return false;
    }
    if (publicKeyHex.length !== 64) {
      return false;
    }
    
    const signature = hexToBytes(signatureHex);
    const publicKey = hexToBytes(publicKeyHex);
    
    return ed.verify(signature, message, publicKey);
  } catch (error) {
    return false;
  }
}

/**
 * Convert hex string to Uint8Array.
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify a challenge-response proof.
 * 
 * The proof is: Sign(private_key, challenge)
 * We verify: Verify(public_key, challenge, signature)
 */
export function verifyChallengeProof(
  challenge: string,
  signatureHex: string,
  publicKeyHex: string
): boolean {
  const message = new TextEncoder().encode(challenge);
  return verifyEd25519Signature(message, signatureHex, publicKeyHex);
}

/**
 * Verify an enrollment proof.
 * 
 * The enrollment proof signs: device_id + timestamp
 */
export function verifyEnrollmentProof(
  deviceId: string,
  timestamp: number,
  signatureHex: string,
  publicKeyHex: string
): boolean {
  const message = new TextEncoder().encode(`${deviceId}:${timestamp}`);
  return verifyEd25519Signature(message, signatureHex, publicKeyHex);
}
