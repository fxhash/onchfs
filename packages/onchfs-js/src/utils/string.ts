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
