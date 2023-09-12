import { chunkBytes } from "./files/chunks"
import {
  inscriptionsStorageBytes,
  Inscription,
  generateInscriptions,
} from "@/files/inscriptions"
import { DEFAULT_CHUNK_SIZE, INODE_BYTE_IDENTIFIER } from "@/config"
import {
  createProxyResolver,
  parseAuthority,
  parseSchema,
  parseSchemaSpecificPart,
  parseURI,
} from "@/resolve"
import type { InodeNativeFS, ProxyResolutionResponse } from "@/resolve"
import { hexStringToBytes } from "@/utils"
import {
  prepareFile,
  FORBIDDEN_METADATA_CHARS,
  encodeFileMetadata,
  fileMetadataBytecodes,
  validateMetadataValue,
  buildDirectoryGraph,
  computeDirectoryInode,
  encodeFilename,
  prepareDirectory,
  decodeFileMetadata,
} from "@/files"

const files = {
  prepareFile,
  prepareDirectory,
  generateInscriptions,
  utils: {
    chunkBytes,
    directory: {
      encodeFilename: encodeFilename,
      computeInode: computeDirectoryInode,
      computeGraph: buildDirectoryGraph,
    },
    inscriptions: {
      computeStorageBytes: inscriptionsStorageBytes,
    },
    metadata: {
      bytecodes: fileMetadataBytecodes,
      validateValue: validateMetadataValue,
      encode: encodeFileMetadata,
      decode: decodeFileMetadata,
    },
  },
}

/**
 * Wraps the low-level utility functions in a nested object to cleanup the
 * consumer API.
 */
const utils = {
  // TODO see what to do, duplicate with files.utils
  chunkBytes,
  // TODO see what to do, duplicate with files.utils
  encodeFilename,
  // TODO see what to do, duplicate with files.utils
  computeDirectoryInode,
  // TODO see what to do, duplicate with files.utils
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
  // TODO see what to do, duplicate with files.utils
  fileMetadataBytecodes,
  // TODO see what to do, duplicate with files.utils
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
  create: createProxyResolver,
}

const Onchfs = {
  utils,
  config,
  uri,
  resolver,
  files,
}
export default Onchfs

export { utils, config, uri, resolver, files }

export type { Inscription, InodeNativeFS, ProxyResolutionResponse }

// Used to expose the library to the browser build version
if (typeof window !== "undefined") {
  ;(window as any).Onchfs = Onchfs
}
