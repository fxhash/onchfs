import { keccak256 } from "js-sha3"

/**
 * Hashes some bytes with keccak256. Simple typed wrapper to ease implementation
 * @param bytes Bytes to hash
 */
export function keccak(bytes: Uint8Array | string): Uint8Array {
  return new Uint8Array(keccak256.digest(bytes))
}
