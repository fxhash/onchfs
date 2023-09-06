"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunkBytes = void 0;
const keccak_1 = __importDefault(require("keccak"));
const config_1 = require("./config");
const utils_1 = require("./utils");
/**
 * Splits the content of a file into multiple chunks of the same size (except
 * case a smaller chunk upload will be required). Chunks are also hashed, as
 * such this function returns tuples of (chunk, chunkHash).
 * @param content Raw byte content of the file
 * @param chunkSize Size of the chunks, it's recommend to pick the highest
 * possible chunk size for the targetted blockchain as to optimise the number
 * of write operations which will be performed. Depending on the use-case there
 * might be a need to create smaller chunks to allow for redundancy of similar
 * chunks uploaded to kick-in, resulting in write optimisations. As a reminder,
 * 32 bytes will be used to address a chunk in the store, as such every chunk
 * to be stored requires 32 bytes of extra storage.
 * @returns a list of chunks which can be uploaded to reconstruct the file
 */
function chunkBytes(content, chunkSize = config_1.DEFAULT_CHUNK_SIZE) {
    const L = content.length;
    const nb = Math.ceil(L / chunkSize);
    const chunks = [];
    let chunk;
    for (let i = 0; i < nb; i++) {
        chunk = (0, utils_1.BufferCopyFrom)(content, i * chunkSize, Math.min(chunkSize, L - i * chunkSize));
        chunks.push({
            bytes: chunk,
            hash: (0, keccak_1.default)("keccak256").update(chunk).digest(),
        });
    }
    return chunks;
}
exports.chunkBytes = chunkBytes;
//# sourceMappingURL=chunks.js.map