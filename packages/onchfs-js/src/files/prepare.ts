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

/**
 * Prepare a file for its insertion on onchfs. Once a file is prepared, it will
 * be represented as an object which provides the properties required for its
 * insertion on onchfs. The file will be chunked given the chunk size provided
 * in options (or the default one if none is provided). The output can be passed
 * to `inscriptions.prepare()` to get a list of onchfs inscriptions to inscribe
 * the file.
 *
 * @example
 *
 * ```ts
 * onchfs.files.prepare({
 *   content: new Uint8Array(...),
 *   path: "filename.html" //! important: will be used to derive Content-Type !
 * })
 * ```
 *
 * @param file The file content/name to insert; The name MUST have an
 * appropriate extension as the Content-Type will be derived from it
 * @param options Optional processing options
 *
 * @returns The file inode, compliant to onchfs specs.
 */
export function prepare(file: IFile, options?: OnchfsPrepareOptions): FileInode

/**
 * Prepare a directory for its insertion on onchfs. A directory is defined as a
 * list of files, where their path is indicated from the root of the directory.
 * Once a directory is prepared, it will be represented by a directory inode
 * object which is constructed in a way that replicates the internal storage on
 * onchfs. It may contain other directories or files depending on the given
 * structure. The output can be passed to `inscriptions.prepare()` to get a list
 * of onchfs inscriptions to inscribe the file.
 *
 * @example
 *
 * ```ts
 * onchfs.files.prepare([
 *   {
 *     content: new Uint8Array(...),
 *     path: "index.html"
 *   },
 *   {
 *     content: new Uint8Array(...),
 *     path: "style.css"
 *   },
 *   {
 *     content: new Uint8Array(...),
 *     path: "lib/main.js"
 *   },
 * ])
 * ```
 * Produces the following directory structure:
 * ```
 * .
 * ├── index.html
 * ├── style.css
 * └── lib/
 *     └── main.js
 * ```
 *
 * @param file The file content/name to insert; The name MUST have an
 * appropriate extension as the Content-Type will be derived from it
 * @param options Optional processing options
 *
 * @returns The file inode, compliant to onchfs specs.
 */
export function prepare(
  files: IFile[],
  options?: OnchfsPrepareOptions
): DirectoryInode

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
