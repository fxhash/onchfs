export type FileChunk = {
  bytes: Uint8Array
  hash: Uint8Array
}

export type FileInode = {
  type: "file"
  chunks: FileChunk[]
  cid: Uint8Array
  metadata: Uint8Array
}

export type DirectoryInode = {
  type: "directory"
  cid: Uint8Array
  files: {
    [name: string]: INode
  }
}

export type INode = DirectoryInode | FileInode

export type IFile = {
  path: string
  content: Uint8Array
}

/**
 * The Prepare typings are used to build a temporary graph for exploring a
 * directory structure, before it is turned into proper File Objects which can
 * be turned into inscriptions.
 */

export type PrepareDirectoryFile = {
  type: "file"
  name: string
  content: Uint8Array
  parent: PrepareDirectoryDir
  inode?: FileInode
}

export type PrepareDirectoryDir = {
  type: "directory"
  files: {
    [name: string]: PrepareDirectoryNode
  }
  parent: PrepareDirectoryDir | null
  inode?: DirectoryInode
}

export type PrepareDirectoryNode = PrepareDirectoryFile | PrepareDirectoryDir

export interface OnchfsPrepareOptions {
  chunkSize?: number
}
