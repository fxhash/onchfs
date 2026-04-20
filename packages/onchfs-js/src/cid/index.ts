import { concatUint8Arrays, keccak } from "@/utils"
import { FileChunk, FileHashingStrategy } from ".."
import { INODE_BYTE_IDENTIFIER } from "@/config"

/**
 * Computes the CID of a file given its chunk parts, metadata, and the
 * strategy which should be used for the computation.
 *
 * @param strategy The strategy with which a file CID is computed. Based on the
 * blockchain, such strategy can be different for optimization purposes.
 * @param chunks The chunks of the file, in the right Order_By
 * @param metadata The metadata associated with the file, already compressed in
 * the right byte format
 *
 * @returns CID of the gile given the strategy
 */
export function computeFileCid(
  chunks: FileChunk[],
  metadata: Uint8Array,
  strategy: FileHashingStrategy
): Uint8Array {
  if (strategy === "consistent") {
    // compute the file unique identifier, following the onchfs specifications:
    // keccak( 0x01 , keccak( content ), keccak( metadata ) )
    const wholeBytes = concatUint8Arrays(...chunks.map(ch => ch.bytes))
    const contentHash = keccak(wholeBytes)
    const metadataHash = keccak(metadata)
    return keccak(
      concatUint8Arrays(INODE_BYTE_IDENTIFIER.FILE, contentHash, metadataHash)
    )
  } else if (strategy === "cheap") {
    // compute the file unique identifier, following the onchfs specifications:
    // keccak( 0x01 , keccak( checksums ), keccak( metadata ) )
    const chunksChecksumsHashed = keccak(
      concatUint8Arrays(...chunks.map(chunk => chunk.hash))
    )
    const metadataHash = keccak(metadata)

    return keccak(
      concatUint8Arrays(
        INODE_BYTE_IDENTIFIER.FILE,
        chunksChecksumsHashed,
        metadataHash
      )
    )
  } else {
    throw new Error("Cannot compute file CID: strategy is missing")
  }
}
