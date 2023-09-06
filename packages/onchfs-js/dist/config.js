"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_CHUNK_SIZE = exports.INODE_BYTE_IDENTIFIER = void 0;
// an identifying byte is used when hasing files & directories, in order to
// prevent eventual collisions at a high level
exports.INODE_BYTE_IDENTIFIER = {
    FILE: Buffer.from("01", "hex"),
    DIRECTORY: Buffer.from("00", "hex"),
};
// sort of a mgic value, as it's impossible to have a single number to rule
// them all; applications would have to pick the right chunk size here as to
// improve storage being shared as much as possible depending on the use cases
exports.DEFAULT_CHUNK_SIZE = 16384;
//# sourceMappingURL=config.js.map