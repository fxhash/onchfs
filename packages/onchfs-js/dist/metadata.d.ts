/// <reference types="node" />
export interface FileMetadataEntries {
    "Content-Type"?: string;
    "Content-Encoding"?: "gzip" | "deflate" | "compress";
}
export type FileMetadataBytecodes = {
    [entry in keyof FileMetadataEntries]: Buffer;
};
export declare const fileMetadataBytecodes: FileMetadataBytecodes;
export declare const FORBIDDEN_METADATA_CHARS: number[];
/**
 * Validate a metadata field value to check if if follows https contrasts.
 * todo: should be refined to properly implement the HTTP spec, right now just
 *       NUL is verified
 * @param value The metadata field value
 */
export declare function validateMetadataValue(value: string): void;
/**
 * Encodes the metadata of a file following the specifications provided by the
 * onchfs. Each entry is prefixed by 2 bytes encoding the entry type, followed
 * by 7-bit ASCII encoded characters for the string-value associated.
 * The metadata entries are sorted by their 2 bytes identifier.
 * @param metadata The object metadata of a file
 * @returns An array of buffers, each entry representing one metadata property
 */
export declare function encodeFileMetadata(metadata: FileMetadataEntries): Buffer[];
