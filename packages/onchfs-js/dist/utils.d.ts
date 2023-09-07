/// <reference types="node" />
/**
 * Instanciate a new buffer and copy the bytes from a source buffer in a
 * given range.
 * @param source The source to copy from
 * @param offset Offset in the source
 * @param length Number of bytes to copy after the offset. If empty, will copy
 * everything after the offset.
 * @returns A new buffer, with bytes copied from the source in given interval
 */
export declare function BufferCopyFrom(source: Buffer, offset?: number, length?: number): Buffer;
/**
 * Intanciates a new Uint8Array in which the requested bytes from the source
 * are copied into.
 * @param source The source to copy from
 * @param offset Offset in the source
 * @param length Number of bytes to copy after the offset. If undefined (def),
 * will copy everything after the offset.
 * @returns A new Uint8Array
 */
export declare function BytesCopiedFrom(source: Uint8Array, offset?: number, length?: number): Uint8Array;
/**
 * Hashes some bytes with keccak256. Simple typed wrapper to ease implementation
 * @param bytes Bytes to hash
 */
export declare function keccak(bytes: Uint8Array | string): Uint8Array;
/**
 * Instanciates a new Uint8Array and concatenates the given Uint8Arrays
 * together in the newly instanciated array.
 * @param arrays The Uint8Arrays to concatenate together
 * @returns A new Uint8Array
 */
export declare function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array;
export declare function compareUint8Arrays(a: Uint8Array, b: Uint8Array): number;
