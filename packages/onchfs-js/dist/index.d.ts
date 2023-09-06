/// <reference types="node" />
type FileChunk = {
    bytes: Buffer;
    hash: Buffer;
};
type FileInode = {
    type: "file";
    chunks: FileChunk[];
    cid: Buffer;
    metadata: Buffer[];
};
type DirectoryInode = {
    type: "directory";
    cid: Buffer;
    files: {
        [name: string]: INode;
    };
};
type INode = DirectoryInode | FileInode;
type IFile = {
    path: string;
    content: Buffer;
};
/**
 * Splits the content of a file into multiple chunks of the same size (except
 * if the remaining bytes of the last chunk don't cover a full chunk, in which
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
export declare function chunkFile(content: Buffer, chunkSize?: number): FileChunk[];
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
export declare function prepareFile(name: string, content: Buffer, chunkSize?: number): Promise<FileInode>;
/**
 * Given a list of files, will create an inverted tree of the directory
 * structure with the main directory as its root. Each file will be chunked in
 * preparation for the insertion. The whole structure will be ready for
 * computing the inscriptions on any blockchain network on which the protocol
 * is deployed.
 * @param files A list a files (with their path relative to the root of the
 * directory and their byte content)
 * @param chunkSize Maximum size of the chunks in which the file will be divided
 * @returns A root directory inode from which the whole directory tree can be
 * traversed, as it's going to be inscribed.
 */
export declare function prepareDirectory(files: IFile[], chunkSize?: number): Promise<DirectoryInode>;
type InscriptionChunk = {
    type: "chunk";
    content: Buffer;
};
type InscriptionFile = {
    type: "file";
    metadata: Buffer[];
    chunks: Buffer[];
};
type InscriptionDirectory = {
    type: "directory";
    files: {
        [name: string]: Buffer;
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
export {};
