/**
 * Intanciates a new Uint8Array in which the requested bytes from the source
 * are copied into. Inspired by nodejs Bytes.copyBytesFrom()
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

/**
 * Naïve Uint8Arrays comparaison for sorting. Loops through the bytes of array A
 * and compare their value against bytes of array B at the same index.
 * @param a First Uint8Array to compare
 * @param b Second Uint8Array to compare
 * @returns -1 if a < b, otherwise 1
 */
export function compareUint8Arrays(a: Uint8Array, b: Uint8Array): number {
  // negative if a is less than b
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return -1
    if (a[i] > b[i]) return 1
  }
  return 1
}

/**
 * Equality comparaison between 2 Uint8Arrays. Arrays are equal if they have the
 * same length and if all their components are equal to their counterpart
 * components at the same index.
 * @param a
 * @param b
 * @returns true if equal, false otherwise
 */
export function areUint8ArrayEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}
