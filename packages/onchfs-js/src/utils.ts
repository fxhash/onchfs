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

export function areUint8ArrayEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * Converts a hexadecimal string in a list of bytes, considering each pair
 * of characters in the string represents a byte. Will throw if the format
 * of the string is incorrect.
 * @param hex A hexadecimal string
 * @returns The bytes decoded from the hexadecimal string
 */
export function hexStringToBytes(hex: string): Uint8Array {
  const reg = new RegExp("^(?:[a-fA-F0-9]{2})*$")
  if (!reg.exec(hex)) {
    throw new Error(
      `Cannot decode an hexadecimal string because its pattern is invalid\nExpected: ${reg.toString()}\nGot ${hex.slice(
        0,
        80
      )}${hex.length > 80 ? "..." : ""}`
    )
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length / 2; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}
