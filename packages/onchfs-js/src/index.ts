import { chunkFile } from "./chunks"
import { generateInscriptions } from "./inscriptions"
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
  chunkFile,
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
}

export default {
  prepareFile,
  prepareDirectory,
  generateInscriptions,
  utils,
  config,
}
