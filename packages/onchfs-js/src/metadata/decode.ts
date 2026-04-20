import { FileMetadataEntries } from "@/types/metadata"
import hpack from "hpack.js"

/**
 * Decodes the HPACKed metadata into a POJO, where keys are the header keys,
 * and value their respective string value.
 *
 * @example
 *
 * ```ts
 * const encoded = Uint8Array([...])
 * const decoded = onchfs.metadata.decode(encoded)
 * // {
 * //  "content-type": "text/html",
 * //  "content-encoding": "gzip"
 * //}
 * ```
 *
 * @param raw The raw bytes of the hpack-encoded metadata
 *
 * @returns Map of metadata headers
 */
export function decodeMetadata(raw: Uint8Array): FileMetadataEntries {
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
