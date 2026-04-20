import { DEFAULT_CHUNK_SIZE } from "@/config"
import { FileChunk } from "@/types/files"
import { BytesCopiedFrom, keccak } from "@/utils"

/**
 * Splits some bytes (in most cases the content of a file) into multiple chunks
 * of the same size (except if the remaining bytes of the last chunk don't
 * cover a full chunk, in which case a smaller chunk is produced). Chunks are
 * also hashed, as such this function returns tuples of (chunk, chunkHash).
 *
 * @example
 *
 * ```ts
 * const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
 * const chunks = onchfs.files.utils.chunkBytes(bytes, 4)
 * // {
 * //   chunks: [ [0,1,2,3], [4,5,6,7], [8,9] ],
 * //   hash: Uint8Array(...),
 * // }
 * ```
 *
 * @param content Raw byte content of the file
 * @param chunkSize Size of the chunks, it's recommend to pick the highest
 * possible chunk size for the targetted blockchain as to optimise the number
 * of write operations which will be performed. Depending on the use-case there
 * might be a need to create smaller chunks to allow for redundancy of similar
 * chunks uploaded to kick-in, resulting in write optimisations. As a reminder,
 * 32 bytes will be used to address a chunk in the store, as such every chunk
 * to be stored requires 32 bytes of extra storage.
 *
 * @returns A list of chunks (bytes, hash) which can be individually uploaded on
 * onchfs.
 */
export function chunkBytes(
  content: Uint8Array,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): FileChunk[] {
  if (chunkSize == 0) {
    throw new Error(`invalid chunk size, must be positive integer`)
  }
  const L = content.length
  const nb = Math.ceil(L / chunkSize)
  const chunks: FileChunk[] = []
  let chunk: Uint8Array
  for (let i = 0; i < nb; i++) {
    chunk = BytesCopiedFrom(
      content,
      i * chunkSize,
      Math.min(chunkSize, L - i * chunkSize)
    )
    chunks.push({
      bytes: chunk,
      hash: keccak(chunk),
    })
  }
  return chunks
}
