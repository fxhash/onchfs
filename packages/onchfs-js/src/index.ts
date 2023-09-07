import { chunkBytes } from "./chunks"
import {
  generateInscriptions,
  inscriptionsStorageBytes,
  Inscription,
} from "./inscriptions"
import {
  buildDirectoryGraph,
  computeDirectoryInode,
  encodeFilename,
  prepareDirectory,
} from "./directory"
import { prepareFile } from "./file"
import { DEFAULT_CHUNK_SIZE, INODE_BYTE_IDENTIFIER } from "./config"
import {
  FORBIDDEN_METADATA_CHARS,
  encodeFileMetadata,
  fileMetadataBytecodes,
  validateMetadataValue,
} from "./metadata"

/**
 * Wraps the low-level utility functions in a nested object to cleanup the
 * consumer API.
 */
const utils = {
  chunkBytes,
  encodeFilename,
  computeDirectoryInode,
  buildDirectoryGraph,
  validateMetadataValue,
  encodeFileMetadata,
}

/**
 * Wraps the config variables in a nested object to cleanup the consumer API.
 */
const config = {
  INODE_BYTE_IDENTIFIER,
  DEFAULT_CHUNK_SIZE,
  FORBIDDEN_METADATA_CHARS,
  fileMetadataBytecodes,
  inscriptionsStorageBytes,
}

export {
  prepareFile,
  prepareDirectory,
  generateInscriptions,
  utils,
  config,
  Inscription,
}

const Onchfs = {
  prepareFile,
  prepareDirectory,
  generateInscriptions,
  utils,
  config,
}
export default Onchfs

// Used to expose the library to the browser build version
if (global.window) {
  ;(global.window as any).Onchfs = Onchfs
}
