"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chunks_1 = require("./chunks");
const inscriptions_1 = require("./inscriptions");
const directory_1 = require("./directory");
const file_1 = require("./file");
const config_1 = require("./config");
const metadata_1 = require("./metadata");
/**
 * Wraps the low-level utility functions in a nested object to cleanup the
 * consumer API.
 */
const utils = {
    chunkBytes: chunks_1.chunkBytes,
    encodeFilename: directory_1.encodeFilename,
    computeDirectoryInode: directory_1.computeDirectoryInode,
    buildDirectoryGraph: directory_1.buildDirectoryGraph,
    validateMetadataValue: metadata_1.validateMetadataValue,
    encodeFileMetadata: metadata_1.encodeFileMetadata,
};
/**
 * Wraps the config variables in a nested object to cleanup the consumer API.
 */
const config = {
    INODE_BYTE_IDENTIFIER: config_1.INODE_BYTE_IDENTIFIER,
    DEFAULT_CHUNK_SIZE: config_1.DEFAULT_CHUNK_SIZE,
    FORBIDDEN_METADATA_CHARS: metadata_1.FORBIDDEN_METADATA_CHARS,
    fileMetadataBytecodes: metadata_1.fileMetadataBytecodes,
    inscriptionsStorageBytes: inscriptions_1.inscriptionsStorageBytes,
};
exports.default = {
    prepareFile: file_1.prepareFile,
    prepareDirectory: directory_1.prepareDirectory,
    generateInscriptions: inscriptions_1.generateInscriptions,
    utils,
    config,
};
//# sourceMappingURL=index.js.map