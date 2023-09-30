import { DEFAULT_CHUNK_SIZE } from "@/config"
import {
  DirectoryInode,
  FileInode,
  IFile,
  OnchfsPrepareOptions,
} from "@/types/files"
import { prepareDirectory } from "./directory"
import { prepareFile } from "./file"

const defaultPrepareOptions: Required<OnchfsPrepareOptions> = {
  chunkSize: DEFAULT_CHUNK_SIZE,
}

export function prepare(file: IFile, options?: OnchfsPrepareOptions): FileInode
export function prepare(
  files: IFile[],
  options?: OnchfsPrepareOptions
): DirectoryInode

/**
 * Prepares some files for their inscription on the onchfs. If a list of files
 * is provided, will create a directory in which files will be located at its
 * riit.
 * @param files file or list of files to for which insertions to prepare
 * inscriptions
 * @param options Options object to modular behaviour
 * @returns A grapg of nodes/chunks to insert, built as an inverted tree with
 * the upmost node of the tree (if file, file node, otherwise a directory)
 */
export function prepare(
  files: IFile | IFile[],
  options?: OnchfsPrepareOptions
): unknown {
  const _options = {
    ...defaultPrepareOptions,
    ...(options || {}),
  }
  if (Array.isArray(files)) {
    return prepareDirectory(files, _options.chunkSize)
  } else {
    return prepareFile(files, _options.chunkSize)
  }
}
