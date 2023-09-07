"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareUint8Arrays = exports.concatUint8Arrays = exports.keccak = exports.BytesCopiedFrom = exports.BufferCopyFrom = void 0;
const js_sha3_1 = require("js-sha3");
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
/**
 * Intanciates a new Uint8Array in which the requested bytes from the source
 * are copied into.
 * @param source The source to copy from
 * @param offset Offset in the source
 * @param length Number of bytes to copy after the offset. If undefined (def),
 * will copy everything after the offset.
 * @returns A new Uint8Array
 */
function BytesCopiedFrom(source, offset = 0, length) {
    length = typeof length === "undefined" ? source.byteLength - offset : length;
    const out = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        out[i] = source[i + offset];
    }
    return out;
}
exports.BytesCopiedFrom = BytesCopiedFrom;
/**
 * Hashes some bytes with keccak256. Simple typed wrapper to ease implementation
 * @param bytes Bytes to hash
 */
function keccak(bytes) {
    return new Uint8Array(js_sha3_1.keccak256.digest(bytes));
}
exports.keccak = keccak;
/**
 * Instanciates a new Uint8Array and concatenates the given Uint8Arrays
 * together in the newly instanciated array.
 * @param arrays The Uint8Arrays to concatenate together
 * @returns A new Uint8Array
 */
function concatUint8Arrays(...arrays) {
    const L = arrays.reduce((acc, arr) => arr.length + acc, 0);
    const out = new Uint8Array(L);
    let offset = 0;
    for (const arr of arrays) {
        out.set(arr, offset);
        offset += arr.length;
    }
    return out;
}
exports.concatUint8Arrays = concatUint8Arrays;
function compareUint8Arrays(a, b) {
    // negative if a is less than b
    for (let i = 0; i < a.length; i++) {
        if (a[i] < b[i])
            return -1;
    }
    return 1;
}
exports.compareUint8Arrays = compareUint8Arrays;
//# sourceMappingURL=utils.js.map