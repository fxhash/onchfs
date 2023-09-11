import * as chunks from "./chunks"
import * as dir from "./directory"
import * as file from "./file"
import * as inscriptions from "./inscriptions"
import * as metadata from "./metadata"
import { prepareFile } from "./file"

export default {
  prepareFile,
  prepareDirectory: dir.prepareDirectory,
  generateInscriptions: inscriptions.generateInscriptions,
  utils: {
    chunkBytes: chunks.chunkBytes,
    directory: {
      encodeFilename: dir.encodeFilename,
      computeInode: dir.computeDirectoryInode,
      computeGraph: dir.buildDirectoryGraph,
    },
    inscriptions: {
      computeStorageBytes: inscriptions.inscriptionsStorageBytes,
    },
    metadata: {
      bytecodes: metadata.fileMetadataBytecodes,
      validateValue: metadata.validateMetadataValue,
      encode: metadata.encodeFileMetadata,
      decode: metadata.decodeFileMetadata,
    },
  },
}

export { prepareFile }
