import { Inscription } from "@/types/inscriptions"

/**
 * Compute the number of bytes an inscription will take on the storage.
 * @param ins Inscription for which storage space should be computed
 * @returns The number of storage bytes the inscription will take
 */
export function inscriptionBytesLength(ins: Inscription) {
  switch (ins.type) {
    case "chunk":
      // chunk to write + chunk key
      return ins.content.byteLength + 32
    case "directory":
      // for every file in directory:
      //  - 32 bytes for pointer
      //  - 1 byte per character (stored in 7-bit ASCII)
      // and 32 bytes for the directory pointer
      return (
        Object.keys(ins.files)
          .map(name => name.length + 32)
          .reduce((a, b) => a + b, 0) + 32
      )
    case "file":
      // 32 bytes per chunk + metadata + 32 bytes for pointer
      return (
        32 + // 32 bytes for pointer
        32 * ins.chunks.length + // 32 bytes per chunk
        ins.metadata.byteLength
      )
  }
}

/**
 * Computes the maximum number of storage bytes which will be consumed by the
 * inscriptions when they are written on-chain. This is a maximum value, as
 * some chunks/files/directories may already have been written to the storage.
 * Note: this doesn't include eventual gas execution fees, which are blockchain-
 * dependant.
 *
 * @param inscriptions Inscriptions for which storage bytes will be computed
 *
 * @returns Number of bytes the inscriptions may take on the storage
 */
export function inscriptionsBytesLength(inscriptions: Inscription[]): number {
  return inscriptions.reduce((acc, ins) => inscriptionBytesLength(ins) + acc, 0)
}
