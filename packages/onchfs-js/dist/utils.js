"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BufferCopyFrom = void 0;
/**
 * Instanciate a new buffer and copy the bytes from a source buffer in a
 * given range.
 * @param source The source to copy from
 * @param offset Offset in the source
 * @param length Number of bytes to copy after the offset. If empty, will copy
 * everything after the offset.
 * @returns A new buffer, with bytes copied from the source in given interval
 */
function BufferCopyFrom(source, offset = 0, length) {
    length = typeof length === "undefined" ? source.byteLength - offset : length;
    const out = Buffer.alloc(length);
    source.copy(out, 0, offset, offset + length);
    return out;
}
exports.BufferCopyFrom = BufferCopyFrom;
//# sourceMappingURL=utils.js.map