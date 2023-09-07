import { DEFAULT_CHUNK_SIZE, INODE_BYTE_IDENTIFIER } from "./config"
import { prepareFile } from "./file"
import {
  DirectoryInode,
  IFile,
  INode,
  PrepareDirectoryDir,
  PrepareDirectoryFile,
  PrepareDirectoryNode,
} from "./types"
import { concatUint8Arrays, keccak } from "./utils"

/**
 * Encodes the filename in 7-bit ASCII, where UTF-8 characters are escaped. Will
 * also escape any character that are not supported in the URI specification, as
 * these will be fetched using a similar pattern by browsers. The native
 * `encodeURIComponent()` method will be used for such a purpose.
 * @param name Filename to encode
 * @returns Filename encoded in 7-bit ASCII
 */
export function encodeFilename(name: string): string {
  return encodeURIComponent(name)
}

/**
 * Computed the different component of a directory inode based on the
 * preparation object.
 * @param dir A directory being prepared
 * @returns A directory inode, from which insertions can be derived
 */
export function computeDirectoryInode(
  dir: PrepareDirectoryDir
): DirectoryInode {
  const acc: Uint8Array[] = []
  const filenames = Object.keys(dir.files).sort()
  const dirFiles: Record<string, INode> = {}
  for (const filename of filenames) {
    const inode = dir.files[filename].inode!
    dirFiles[filename] = inode
    // push filename hashed
    acc.unshift(keccak(filename))
    // push target inode cid
    acc.unshift(inode.cid)
  }
  // add indentifying byte at the beginning
  acc.unshift(INODE_BYTE_IDENTIFIER.DIRECTORY)
  return {
    type: "directory",
    cid: keccak(concatUint8Arrays(...acc)),
    files: dirFiles,
  }
}

/**
 * Builds a graph from a list of files (relative path from the directory root,
 * content) in a folder structure as it's going to be inscribed on the file
 * system.
 * @param files A list of the files (& their content), where paths are specified with separating "/"
 * @returns A tuple of (graph, leaves), where graph is a structure ready to be
 * parsed for insertion & leaves the leaves of the graph, entry points for
 * parsing the graph in reverse.
 */
export function buildDirectoryGraph(
  files: IFile[]
): [PrepareDirectoryDir, PrepareDirectoryFile[]] {
  let graph: PrepareDirectoryDir = {
    type: "directory",
    files: {},
    parent: null,
  }
  const leaves: PrepareDirectoryFile[] = []

  for (const file of files) {
    let active = graph,
      part: string = ""
    const formattedPath = file.path.startsWith("./")
      ? file.path.slice(2)
      : file.path
    // note: the filenames get encoded here, as the onchfs spec defines
    // filenames need to be inserted in ASCII 7-bit with special characters
    // escape-encoded
    const parts = formattedPath.split("/").map(part => encodeFilename(part))
    for (let i = 0; i < parts.length; i++) {
      part = parts[i]
      // if name is empty, we throw
      if (part.length === 0) {
        throw new Error(
          `The file ${file.path} contains an invalid part, there must be at least 1 character for each part.`
        )
      }
      // if it's the last part, store it as a file
      if (i === parts.length - 1) {
        // if the leaf already exists, we throw an error: there cannot be 2
        // nodes identified by the same path
        if (active.files.hasOwnProperty(part)) {
          throw new Error(
            `The file at path ${file.path} is colliding with another path in the directory. There mush be a single path pointing to a file.`
          )
        }
        const nLeave: PrepareDirectoryFile = {
          type: "file",
          content: file.content,
          name: part,
          parent: active,
        }
        active.files[part] = nLeave
        leaves.push(nLeave)
      }
      // it's a directory, so we need to navigate to it or create a new one
      else {
        if (active.files.hasOwnProperty(part)) {
          active = active.files[part] as any
        } else {
          const nDir: PrepareDirectoryDir = {
            type: "directory",
            files: {},
            parent: active,
          }
          active.files[part] = nDir
          active = nDir
        }
      }
    }
  }

  return [graph, leaves]
}

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
export async function prepareDirectory(
  files: IFile[],
  chunkSize: number = DEFAULT_CHUNK_SIZE
): Promise<DirectoryInode> {
  const [graph, leaves] = buildDirectoryGraph(files)

  const parsed: PrepareDirectoryNode[] = []
  let parsing: PrepareDirectoryNode[] = leaves

  while (parsing.length > 0) {
    const nextParse: PrepareDirectoryNode[] = []
    for (const node of parsing) {
      // if this node has already been parsed, ignore
      if (parsed.includes(node)) continue
      if (node.type === "file") {
        node.inode = await prepareFile(node.name, node.content, chunkSize)
      } else if (node.type === "directory") {
        // compute the inode associated with the directory
        node.inode = computeDirectoryInode(node)
      }
      // marked the node as parsed
      parsed.push(node)
      // push the eventual parent to the nodes to parse; eventually when
      // reaching the head, nothing will have to get parsed
      if (node.parent) {
        // we can only push the parent when all its children have been parsed
        // already (which is checked if .inode property exists)
        const children = Object.values(node.parent.files)
        if (!children.find(child => !child.inode)) {
          nextParse.push(node.parent)
        }
      }
    }
    // once all the nodes to parse have been parsed, assign the next wave
    parsing = nextParse
  }

  // at this point graph.inodes has been populated with the root directory node,
  // which happens to be linked to the rest of the inodes; it can returned
  return graph.inode!
}
