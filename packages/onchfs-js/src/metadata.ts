export interface FileMetadataEntries {
  "Content-Type"?: string
  "Content-Encoding"?: "gzip" | "deflate" | "compress"
}

export type FileMetadataBytecodes = {
  [entry in keyof FileMetadataEntries]: Buffer
}

// map of the metadata fields with their 2-byte identifier, used to encode
// on the blockchain with a smaller footprint
export const fileMetadataBytecodes: FileMetadataBytecodes = {
  "Content-Type": Buffer.from("0001", "hex"),
  "Content-Encoding": Buffer.from("0002", "hex"),
}

// a list of the forbidden characters in the metadata
// todo: point to where I found this in http specs
export const FORBIDDEN_METADATA_CHARS = [
  0, // NUL character
]

/**
 * Validate a metadata field value to check if if follows https contrasts.
 * todo: should be refined to properly implement the HTTP spec, right now just
 *       NUL is verified
 * @param value The metadata field value
 */
export function validateMetadataValue(value: string): void {
  for (let i = 0; i < value.length; i++) {
    if (FORBIDDEN_METADATA_CHARS.includes(value.charCodeAt(i))) {
      throw new Error(
        `contains invalid character (code: ${value.charCodeAt(
          i
        )}) at position ${i}`
      )
    }
  }
}

/**
 * Encodes the metadata of a file following the specifications provided by the
 * onchfs. Each entry is prefixed by 2 bytes encoding the entry type, followed
 * by 7-bit ASCII encoded characters for the string-value associated.
 * The metadata entries are sorted by their 2 bytes identifier.
 * @param metadata The object metadata of a file
 * @returns An array of buffers, each entry representing one metadata property
 */
export function encodeFileMetadata(metadata: FileMetadataEntries): Buffer[] {
  const out: Buffer[] = []
  let value: string
  for (const entry in metadata) {
    value = metadata[entry]
    try {
      validateMetadataValue(value)
    } catch (err) {
      throw new Error(
        `Error when validating the metadata field "${entry}": ${err.message}`
      )
    }
    out.push(
      Buffer.concat([fileMetadataBytecodes[entry], Buffer.from(value, "ascii")])
    )
  }
  return out.sort((a, b) =>
    Buffer.compare(Buffer.from(a, 0, 2), Buffer.from(b, 0, 2))
  )
}
