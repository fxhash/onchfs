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
