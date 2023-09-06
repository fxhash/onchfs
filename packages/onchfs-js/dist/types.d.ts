/// <reference types="node" />
export type FileChunk = {
    bytes: Buffer;
    hash: Buffer;
};
export type FileInode = {
    type: "file";
    chunks: FileChunk[];
    cid: Buffer;
    metadata: Buffer[];
};
export type DirectoryInode = {
    type: "directory";
    cid: Buffer;
    files: {
        [name: string]: INode;
    };
};
export type INode = DirectoryInode | FileInode;
export type IFile = {
    path: string;
    content: Buffer;
};
/**
 * The Prepare typings are used to build a temporary graph for exploring a
 * directory structure, before it is turned into proper File Objects which can
 * be turned into inscriptions.
 */
export type PrepareDirectoryFile = {
    type: "file";
    name: string;
    content: Buffer;
    parent: PrepareDirectoryDir;
    inode?: FileInode;
};
export type PrepareDirectoryDir = {
    type: "directory";
    files: {
        [name: string]: PrepareDirectoryNode;
    };
    parent: PrepareDirectoryDir | null;
    inode?: DirectoryInode;
};
export type PrepareDirectoryNode = PrepareDirectoryFile | PrepareDirectoryDir;
