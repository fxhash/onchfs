import {
  BytesCopiedFrom,
  areUint8ArrayEqual,
  compareUint8Arrays,
  concatUint8Arrays,
} from "@/utils"
import hpack from "hpack.js"

export interface FileMetadataEntries {
  "content-type"?: string
  "content-encoding"?: "gzip" | "deflate" | "compress"
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
 * Given a field name, outputs its index in the HPACK static table.
 * @param name Name of the field to check in the static table
 */
function fieldHpackStaticTableIndex(name: string): number | null {
  const elem = hpack["static-table"].table.find(
    row => row.name === name.toLowerCase()
  )
  if (!elem) return null
  return hpack["static-table"].table.indexOf(elem)
}

/**
 * Encodes the metadata of a file following the specifications provided by the
 * onchfs. Each entry is prefixed by 2 bytes encoding the entry type, followed
 * by 7-bit ASCII encoded characters for the string-value associated.
 * The metadata entries are sorted by their 2 bytes identifier.
 * @param metadata The object metadata of a file
 * @returns An array of buffers, each entry representing one metadata property
 */
export function encodeFileMetadata(metadata: FileMetadataEntries): Uint8Array {
  const comp = hpack.compressor.create({ table: { size: 256 } })
  let headers: any[] = []
  let name: string, value: string
  for (const entry in metadata) {
    name = entry.toLowerCase()
    value = metadata[entry]
    try {
      validateMetadataValue(value)
    } catch (err: any) {
      throw new Error(
        `Error when validating the metadata field "${entry}": ${err.message}`
      )
    }
    headers.push({
      name,
      value,
    })
  }

  // sort the headers based on their indices in the HPACK static table
  headers = headers.sort((a, b) => {
    const iA = fieldHpackStaticTableIndex(a.name)
    const iB = fieldHpackStaticTableIndex(b.name)
    if (iA === null && iB !== null) return -1
    if (iB === null && iA !== null) return 1
    if (iA === null && iB === null) return 0
    return iB - iA
  })
  comp.write(headers)
  // ensures proper Uint8array typing at the end of the call
  return new Uint8Array(comp.read())
}

/**
 * Decodes the HPACKed metadata into a POJO, where keys are the header keys,
 * and value their respective string value.
 * @param raw The raw bytes of the hpack-encoded metadata
 * @returns POJO of metadata header
 */
export function decodeFileMetadata(raw: Uint8Array): FileMetadataEntries {
  const decomp = hpack.decompressor.create({ table: { size: 256 } })
  const metadata: FileMetadataEntries = {}
  decomp.write(raw)
  decomp.execute()
  let buff: any
  while ((buff = decomp.read())) {
    metadata[buff.name] = buff.value
  }
  return metadata
}
