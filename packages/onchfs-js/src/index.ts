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
import {
  parseAuthority,
  parseSchema,
  parseSchemaSpecificPart,
  parseURI,
} from "./uri"

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

/**
 * Wraps th URI-related variables in a nested object
 */
const uri = {
  parse: parseURI,
  utils: {
    parseSchema,
    parseSchemaSpecificPart,
    parseAuthority,
  },
}

export {
  prepareFile,
  prepareDirectory,
  generateInscriptions,
  utils,
  config,
  uri,
}

export type { Inscription }

const Onchfs = {
  prepareFile,
  prepareDirectory,
  generateInscriptions,
  utils,
  config,
  uri,
}
export default Onchfs

// Used to expose the library to the browser build version
if (typeof window !== "undefined") {
  ;(window as any).Onchfs = Onchfs
}
