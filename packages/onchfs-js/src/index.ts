import { chunkBytes } from "./files/chunks"
import {
  generateInscriptions,
  inscriptionsStorageBytes,
  Inscription,
} from "@/files/inscriptions"
import {
  buildDirectoryGraph,
  computeDirectoryInode,
  encodeFilename,
  prepareDirectory,
} from "@/files/directory"
import { prepareFile } from "@/files/file"
import { DEFAULT_CHUNK_SIZE, INODE_BYTE_IDENTIFIER } from "@/config"
import {
  FORBIDDEN_METADATA_CHARS,
  encodeFileMetadata,
  fileMetadataBytecodes,
  validateMetadataValue,
} from "@/files/metadata"
import {
  parseAuthority,
  parseSchema,
  parseSchemaSpecificPart,
  parseURI,
} from "@/resolution/uri"
import {
  InodeNativeFS,
  ProxyResolutionResponse,
  createOnchfsResolver,
} from "./resolution/factory"
import { hexStringToBytes } from "@/utils"

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
  hexStringToBytes,
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

const resolver = {
  create: createOnchfsResolver,
}

export {
  prepareFile,
  prepareDirectory,
  generateInscriptions,
  utils,
  config,
  uri,
  resolver,
}

export type { Inscription, InodeNativeFS, ProxyResolutionResponse }

const Onchfs = {
  prepareFile,
  prepareDirectory,
  generateInscriptions,
  utils,
  config,
  uri,
  resolver,
}
export default Onchfs

// Used to expose the library to the browser build version
if (typeof window !== "undefined") {
  ;(window as any).Onchfs = Onchfs
}
