import hpack from "hpack.js"
import { validateMetadataValue } from "./validation"
import { fieldHpackStaticTableIndex } from "./shared"
import { FileMetadataEntries } from "@/types/metadata"

/**
 * Encodes the metadata of a file following the specifications provided by the
 * onchfs. Each entry is prefixed by 2 bytes encoding the entry type, followed
 * by 7-bit ASCII encoded characters for the string-value associated.
 * The metadata entries are sorted by their 2 bytes identifier.
 * @param metadata The object metadata of a file
 * @returns An array of buffers, each entry representing one metadata property
 */
export function encodeMetadata(metadata: FileMetadataEntries): Uint8Array {
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
