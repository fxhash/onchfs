import { keccak256 } from "js-sha3"

/**
 * Intanciates a new Uint8Array in which the requested bytes from the source
 * are copied into.
 * @param source The source to copy from
 * @param offset Offset in the source
 * @param length Number of bytes to copy after the offset. If undefined (def),
 * will copy everything after the offset.
 * @returns A new Uint8Array
 */
export function BytesCopiedFrom(
  source: Uint8Array,
  offset = 0,
  length?: number
) {
  length = typeof length === "undefined" ? source.byteLength - offset : length
  const out = new Uint8Array(length)
  for (let i = 0; i < length; i++) {
    out[i] = source[i + offset]
  }
  return out
}

/**
 * Hashes some bytes with keccak256. Simple typed wrapper to ease implementation
 * @param bytes Bytes to hash
 */
export function keccak(bytes: Uint8Array | string): Uint8Array {
  return new Uint8Array(keccak256.digest(bytes))
}

/**
 * Instanciates a new Uint8Array and concatenates the given Uint8Arrays
 * together in the newly instanciated array.
 * @param arrays The Uint8Arrays to concatenate together
 * @returns A new Uint8Array
 */
export function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const L = arrays.reduce((acc, arr) => arr.length + acc, 0)
  const out = new Uint8Array(L)
  let offset = 0
  for (const arr of arrays) {
    out.set(arr, offset)
    offset += arr.length
  }
  return out
}

export function compareUint8Arrays(a: Uint8Array, b: Uint8Array): number {
  // negative if a is less than b
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return -1
    if (a[i] > b[i]) return 1
  }
  return 1
}
