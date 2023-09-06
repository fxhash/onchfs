// an identifying byte is used when hasing files & directories, in order to
// prevent eventual collisions at a high level
export const INODE_BYTE_IDENTIFIER = {
  FILE: Buffer.from("01", "hex"),
  DIRECTORY: Buffer.from("00", "hex"),
}

// sort of a mgic value, as it's impossible to have a single number to rule
// them all; applications would have to pick the right chunk size here as to
// improve storage being shared as much as possible depending on the use cases
export const DEFAULT_CHUNK_SIZE = 16384
