// an identifying byte is used when hasing files & directories, in order to

import { BlockchainNetwork } from "./types"

// prevent eventual collisions at a high level
export const INODE_BYTE_IDENTIFIER = {
  FILE: new Uint8Array([1]),
  DIRECTORY: new Uint8Array([0]),
}

// sort of a mgic value, as it's impossible to have a single number to rule
// them all; applications would have to pick the right chunk size here as to
// improve storage being shared as much as possible depending on the use cases
export const DEFAULT_CHUNK_SIZE = 16384

export const CHAIN_IDS = {
  tezos: {
    mainnet: "NetXdQprcVkpaWU",
    ghostnet: "NetXnHfVqm9iesp",
  },
  eip155: {
    mainnet: "1",
    goerli: "5",
    sepolia: "11155111",
    baseMainnet: "8453",
    baseSepolia: "84532",
  },
} as const

// A naive map of the "official" onchfs Smart Contracts.
export const DEFAULT_CONTRACTS: Record<BlockchainNetwork, string> = {
  // tezos mainnet
  "tezos:NetXdQprcVkpaWU": "KT1Ae7dT1gsLw2tRnUMXSCmEyF74KVkM6LUo",
  // tezos ghostnet
  "tezos:NetXnHfVqm9iesp": "KT1FA8AGGcJha6S6MqfBUiibwTaYhK8u7s9Q",
  // eth mainnet
  "eip155:1": "0x9e0f2864c6f125bbf599df6ca6e6c3774c5b2e04",
  // eth goerli
  "eip155:5": "0xc3f5ef1a0256b9ceb1452650db72344809bb3a85",
  // eth sepolia
  "eip155:11155111": "0x4f555d39e89f6d768f75831d610b3940fa94c6b1",
  // base mainnet
  "eip155:8453": "0x2983008f292a43f208bba0275afd7e9b3d39af3b",
  // base sepolia
  "eip155:84532": "0x3fb48e03291b2490f939c961a1ad088437129f71",
}
