/// <reference types="node" />
import { chunkBytes } from "./chunks";
import { generateInscriptions, inscriptionsStorageBytes } from "./inscriptions";
import { buildDirectoryGraph, computeDirectoryInode, encodeFilename, prepareDirectory } from "./directory";
import { prepareFile } from "./file";
import { encodeFileMetadata, validateMetadataValue } from "./metadata";
declare const _default: {
    prepareFile: typeof prepareFile;
    prepareDirectory: typeof prepareDirectory;
    generateInscriptions: typeof generateInscriptions;
    utils: {
        chunkBytes: typeof chunkBytes;
        encodeFilename: typeof encodeFilename;
        computeDirectoryInode: typeof computeDirectoryInode;
        buildDirectoryGraph: typeof buildDirectoryGraph;
        validateMetadataValue: typeof validateMetadataValue;
        encodeFileMetadata: typeof encodeFileMetadata;
    };
    config: {
        INODE_BYTE_IDENTIFIER: {
            FILE: Buffer;
            DIRECTORY: Buffer;
        };
        DEFAULT_CHUNK_SIZE: number;
        FORBIDDEN_METADATA_CHARS: number[];
        fileMetadataBytecodes: import("./metadata").FileMetadataBytecodes;
        inscriptionsStorageBytes: typeof inscriptionsStorageBytes;
    };
};
export default _default;
