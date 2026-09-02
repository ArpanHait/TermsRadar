/**
 * Shared Crypto Utilities
 * Common hex conversion and hashing logic for both Cloudflare Worker and Chrome Extension.
 */

// Pre-computed 256-byte hex lookup table to eliminate intermediate string allocations
export const HEX_TABLE = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));

/**
 * Converts a Uint8Array (or ArrayBuffer) to a lowercase hex string.
 * Uses pre-computed lookup table for zero-allocation conversion.
 */
export function bytesToHex(bytes) {
  const uint8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let hex = '';
  for (let i = 0; i < uint8.length; i++) {
    hex += HEX_TABLE[uint8[i]];
  }
  return hex;
}

/**
 * Computes SHA-256 hash of a string (for Cloudflare Worker / text inputs).
 */
export async function hashString(str) {
  const msgUint8 = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  return bytesToHex(hashBuffer);
}

/**
 * Computes SHA-256 hash of an ArrayBuffer (for Chrome Extension / binary inputs).
 */
export async function hashArrayBuffer(arrayBuffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  return bytesToHex(hashBuffer);
}