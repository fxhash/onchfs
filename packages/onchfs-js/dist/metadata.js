"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeFileMetadata = exports.validateMetadataValue = exports.FORBIDDEN_METADATA_CHARS = exports.fileMetadataBytecodes = void 0;
// map of the metadata fields with their 2-byte identifier, used to encode
// on the blockchain with a smaller footprint
exports.fileMetadataBytecodes = {
    "Content-Type": Buffer.from("0001", "hex"),
    "Content-Encoding": Buffer.from("0002", "hex"),
};
// a list of the forbidden characters in the metadata
// todo: point to where I found this in http specs
exports.FORBIDDEN_METADATA_CHARS = [
    0, // NUL character
];
/**
 * Validate a metadata field value to check if if follows https contrasts.
 * todo: should be refined to properly implement the HTTP spec, right now just
 *       NUL is verified
 * @param value The metadata field value
 */
function validateMetadataValue(value) {
    for (let i = 0; i < value.length; i++) {
        if (exports.FORBIDDEN_METADATA_CHARS.includes(value.charCodeAt(i))) {
            throw new Error(`contains invalid character (code: ${value.charCodeAt(i)}) at position ${i}`);
        }
    }
}
exports.validateMetadataValue = validateMetadataValue;
/**
 * Encodes the metadata of a file following the specifications provided by the
 * onchfs. Each entry is prefixed by 2 bytes encoding the entry type, followed
 * by 7-bit ASCII encoded characters for the string-value associated.
 * The metadata entries are sorted by their 2 bytes identifier.
 * @param metadata The object metadata of a file
 * @returns An array of buffers, each entry representing one metadata property
 */
function encodeFileMetadata(metadata) {
    const out = [];
    let value;
    for (const entry in metadata) {
        if (exports.fileMetadataBytecodes[entry]) {
            // only process if valid entry
            value = metadata[entry];
            try {
                validateMetadataValue(value);
            }
            catch (err) {
                throw new Error(`Error when validating the metadata field "${entry}": ${err.message}`);
            }
            out.push(Buffer.concat([
                exports.fileMetadataBytecodes[entry],
                Buffer.from(value, "ascii"),
            ]));
        }
    }
    return out.sort((a, b) => Buffer.compare(Buffer.from(a, 0, 2), Buffer.from(b, 0, 2)));
}
exports.encodeFileMetadata = encodeFileMetadata;
//# sourceMappingURL=metadata.js.map