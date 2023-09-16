// an identifying byte is used when hasing files & directories, in order to
// prevent eventual collisions at a high level
export const INODE_BYTE_IDENTIFIER = {
  FILE: new Uint8Array([1]),
  DIRECTORY: new Uint8Array([0]),
}

// sort of a mgic value, as it's impossible to have a single number to rule
// them all; applications would have to pick the right chunk size here as to
// improve storage being shared as much as possible depending on the use cases
export const DEFAULT_CHUNK_SIZE = 16384

// TODO: insert true values here.
// A naive map of the "official" onchfs Smart Contracts.
export const DEFAULT_CONTRACTS: Record<string, string> = {
  "tezos:mainnet": "KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC",
  "tezos:ghostnet": "KT1XZ2FyRNtzYCBoy18Rp7R9oejvFSPqkBoy",
  "ethereum:1": "b0e58801d1b4d69179b7bc23fe54a37cee999b09",
  "ethereum:5": "fcfdfa971803e1cc201f80d8e74de71fddea6551",
}
