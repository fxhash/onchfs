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

/**
 * How the File cids are constructed. Some blockchains are expensive and as
 * such having a consistent cid generation on the input bytes might be quite
 * expensive, as such the file system supports 2 ways of hashing files:
 * - consistent: hash the whole file content
 * - cheap: hash the checksums of the file chunks
 */
export type FileHashingStrategy = "consistent" | "cheap"

export interface OnchfsPrepareOptions {
  /**
   * The size of the chunks. Leaving is as default will fallback to onchfs
   * default chunk size, which is meant to be optimized for most purposes.
   */
  chunkSize?: number

  /**
   * The strategy which will be used for computing file cids from their
   * chunks.
   */
  fileHashingStrategy?: FileHashingStrategy
}

/**
 * Describes the state of an upload, in terms of size. Such an object can be
 * attached to any entity which can be stored in order to represent its storage
 * state.
 */
export interface UploadProgress {
  /**
   * The total size required for storing the full object from scratch, in bytes.
   */
  total: number
  /**
   * The number of bytes left.
   */
  left: number
}

/**
 * Progress related to a file upload.
 */
export interface FileUploadProgress {
  /**
   * **Absolute path** of the file from the root of the object uploaded.
   */
  path: string

  /**
   * Progress of the upload, includes the progress of the upload of the file
   * chunks.
   */
  progress: UploadProgress
}

/**
 * The summary of an upload of Inscriptions, defining the upload state of the
 * various components of an upload on Onchfs
 */
export interface UploadSummary {
  /**
   * Global progress of the upload. It can be derived from the progress of the
   * files & extra payload, but is given for convenience.
   */
  global: UploadProgress

  /**
   * A list of upload summary for all the files inside the directory, where
   */
  files: FileUploadProgress[]

  /**
   * Some extra payload, mainly used as a reference for non-visible objects
   * such as directories which can have a significant print sometimes.
   */
  extraPayload: UploadProgress
}
