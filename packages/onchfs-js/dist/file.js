"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareFile = void 0;
const node_zopfli_1 = __importDefault(require("node-zopfli"));
const keccak_1 = __importDefault(require("keccak"));
const config_1 = require("./config");
const metadata_1 = require("./metadata");
const mime_types_1 = require("mime-types");
const chunks_1 = require("./chunks");
// import { fileTypeFromBuffer } from "file-type"
/**
 * Computes all the necessary data for the inscription of the file on-chain.
 * Performs the following tasks in order:
 *  - infer/detect the mime-type from the filename/content
 *  - compress the content in gzip using zopfli, but only use the compressed
 *    bytes if they are smaller in size than the raw content
 *  - build the metadata object from previous steps, and encode the metadata in
 *    the format supported by the blockchain
 *  - chunk the content of the file
 *  - compute the CID of the file based on its content & its metadata
 * @param name The filename, will only be used to infer the Mime Type (a magic number cannot be used for text files so this is the privileged method)
 * @param content Byte content of the file, as a Buffer
 * @param chunkSize Max number of bytes for chunking the file content
 * @returns A file node object with all the data necessary for its insertion
 */
async function prepareFile(name, content, chunkSize = config_1.DEFAULT_CHUNK_SIZE) {
    let metadata = {};
    let insertionBytes = content;
    // we use file extension to get mime type
    let mime = (0, mime_types_1.lookup)(name);
    // if no mime type can be mapped from filename, use magic number
    if (!mime) {
        // const magicMime = await fileTypeFromBuffer(content)
        // if (magicMime) {
        //   metadata["Content-Type"] = magicMime.mime
        // }
        // if still no mime, we simply do not set the Content-Type in the metadata,
        // and let the browser handle it.
        // We could set it to "application/octet-stream" as RFC2046 states, however
        // we'd be storing this whole string on-chain for something that's probably
        // going to be inferred as such in any case;
    }
    else {
        metadata["Content-Type"] = mime;
    }
    // compress into gzip using node zopfli, only keep if better
    const compressed = node_zopfli_1.default.gzipSync(content, {
        // adaptative number of iteration depending on file size
        numiterations: content.byteLength > 5000000
            ? 5
            : content.byteLength > 2000000
                ? 10
                : 15,
    });
    if (compressed.byteLength < insertionBytes.byteLength) {
        insertionBytes = compressed;
        metadata["Content-Encoding"] = "gzip";
    }
    // chunk the file
    const chunks = (0, chunks_1.chunkBytes)(insertionBytes, chunkSize);
    // encode the metadata
    const metadataEncoded = (0, metadata_1.encodeFileMetadata)(metadata);
    // compute the file unique identifier, following the onchfs specifications:
    // keccak( 0x01 , keccak( content ), keccak( metadata ) )
    const contentHash = (0, keccak_1.default)("keccak256").update(insertionBytes).digest();
    const metadataHash = (0, keccak_1.default)("keccak256")
        .update(Buffer.concat(metadataEncoded))
        .digest();
    const cid = (0, keccak_1.default)("keccak256")
        .update(Buffer.concat([config_1.INODE_BYTE_IDENTIFIER.FILE, contentHash, metadataHash]))
        .digest();
    return {
        type: "file",
        cid,
        chunks,
        metadata: metadataEncoded,
    };
}
exports.prepareFile = prepareFile;
//# sourceMappingURL=file.js.map