import { INode } from "./types";
export type InscriptionChunk = {
    type: "chunk";
    content: Uint8Array;
};
export type InscriptionFile = {
    type: "file";
    metadata: Uint8Array[];
    chunks: Uint8Array[];
};
export type InscriptionDirectory = {
    type: "directory";
    files: {
        [name: string]: Uint8Array;
    };
};
export type Inscription = InscriptionChunk | InscriptionFile | InscriptionDirectory;
/**
 * Traverse the inverted tree starting by the root, creating inscriptions as
 * it's being traversed. At the end of the flow the inscriptions will be
 * reversed to ensure they are written to the store in the right order (as the
 * onchfs will reject inodes pointing to inexisting resources; let it be file
 * chunks or directory files).
 * @param root The root of the tree, can be either the root directory or a file
 * @returns A list of inscription objects ready to be turned into operations
 */
export declare function generateInscriptions(root: INode): Inscription[];
/**
 * Computes the maximum number of storage bytes which will be consumed by the
 * inscriptions when they are written on-chain. This is a maximum value, as
 * some chunks/files/directories may already have been written to the storage.
 * Note: this doesn't include eventual gas execution fees, which are blockchain-
 * dependant.
 * @param inscriptions Inscriptions for which storage bytes will be computed
 * @returns Number of bytes the inscriptions may take on the storage
 */
export declare function inscriptionsStorageBytes(inscriptions: Inscription[]): number;
