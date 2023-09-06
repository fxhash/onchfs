import keccak from "keccak"
import { lookup as lookupMime } from "mime-types"
// import { fileTypeFromBuffer } from "file-type"
import zopfli from "node-zopfli"
import { BufferCopyFrom } from "./utils"
import fs from "fs"

type FileChunk = {
  bytes: Buffer
  hash: Buffer
}

interface FileMetadataEntries {
  "Content-Type"?: string
  "Content-Encoding"?: "gzip" | "deflate" | "compress"
}

type FileInode = {
  type: "file"
  chunks: FileChunk[]
  cid: Buffer
  metadata: Buffer[]
}

type DirectoryInode = {
  type: "directory"
  cid: Buffer
  files: {
    [name: string]: INode
  }
}

type INode = DirectoryInode | FileInode

type IFile = {
  path: string
  content: Buffer
}

type FileMetadataBytecodes = {
  [entry in keyof FileMetadataEntries]: Buffer
}
const fileMetadataBytecodes: FileMetadataBytecodes = {
  "Content-Type": Buffer.from("0001", "hex"),
  "Content-Encoding": Buffer.from("0002", "hex"),
}

const INODE_BYTE_IDENTIFIER = {
  FILE: Buffer.from("01", "hex"),
  DIRECTORY: Buffer.from("00", "hex"),
}

// sort of a mgic value, as it's impossible to have a single number to rule
// them all; applications would have to pick the right chunk size here as to
// improve storage being shared as much as possible depending on the use cases
const DEFAULT_CHUNK_SIZE = 16384

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
export function chunkFile(
  content: Buffer,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): FileChunk[] {
  const L = content.length
  const nb = Math.ceil(L / chunkSize)
  const chunks: FileChunk[] = []
  let chunk: Buffer
  for (let i = 0; i < nb; i++) {
    chunk = BufferCopyFrom(
      content,
      i * chunkSize,
      Math.min(chunkSize, L - i * chunkSize)
    )
    chunks.push({
      bytes: chunk,
      hash: keccak("keccak256").update(chunk).digest(),
    })
  }
  return chunks
}

const FORBIDDEN_METADATA_CHARS = [
  0, // NUL character
]
function validateMetadataValue(value: string): void {
  for (let i = 0; i < value.length; i++) {
    if (FORBIDDEN_METADATA_CHARS.includes(value.charCodeAt(i))) {
      throw new Error(
        `contains invalid character (code: ${value.charCodeAt(
          i
        )}) at position ${i}`
      )
    }
  }
}

/**
 * Encodes the metadata of a file following the specifications provided by the
 * onchfs. Each entry is prefixed by 2 bytes encoding the entry type, followed
 * by 7-bit ASCII encoded characters for the string-value associated.
 * The metadata entries are sorted by their 2 bytes identifier.
 * @param metadata The object metadata of a file
 * @returns An array of buffers, each entry representing one metadata property
 */
function encodeFileMetadata(metadata: FileMetadataEntries): Buffer[] {
  const out: Buffer[] = []
  let value: string
  for (const entry in metadata) {
    value = metadata[entry]
    try {
      validateMetadataValue(value)
    } catch (err) {
      throw new Error(
        `Error when validating the metadata field "${entry}": ${err.message}`
      )
    }
    out.push(
      Buffer.concat([fileMetadataBytecodes[entry], Buffer.from(value, "ascii")])
    )
  }
  return out.sort((a, b) =>
    Buffer.compare(Buffer.from(a, 0, 2), Buffer.from(b, 0, 2))
  )
}

// a list of the characters forbidden in filenames
const FORBIDDEN_FILENAME_CHARACTERS = ":/?#[]@!$&'()*+,;=".split("")
function validateFilename(name: string): void {
  // check that filename doesn't contain any forbidden character
  let c: string
  for (let i = 0; i < name.length; i++) {
    c = name.charAt(i)
    if (FORBIDDEN_FILENAME_CHARACTERS.includes(c)) {
      throw new Error(
        `"${c}" is forbidden in filenames (forbidden characters: ${FORBIDDEN_FILENAME_CHARACTERS.join(
          ""
        )})`
      )
    }
  }
}

/**
 * Encodes the filename in 7-bit ASCII, where UTF-8 characters are escaped. Will
 * also escape any character that are not supported in the URI specification, as
 * these will be fetched using a similar pattern by browsers. The native
 * `encodeURIComponent()` method will be used for such a purpose.
 * @param name Filename to encode
 * @returns Filename encoded in 7-bit ASCII
 */
function encodeFilename(name: string): string {
  return encodeURIComponent(name)
}

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
export async function prepareFile(
  name: string,
  content: Buffer,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): Promise<FileInode> {
  let metadata: FileMetadataEntries = {}
  let insertionBytes = content
  // we use file extension to get mime type
  let mime = lookupMime(name)
  // if no mime type can be mapped from filename, use magic number
  if (!mime) {
    // const magicMime = await fileTypeFromBuffer(content)
    // if (magicMime) {
    //   metadata["Content-Type"] = magicMime.mime
    // }
    // if still no mime, we simply do not set the Content-Type in the metadata,
    // and let the browser handle it.
    // We could set it to "application/octet-stream" as RFC2046 states, however
    // we'd be storing this whole string on-chain for something that's probably
    // going to be inferred as such in any case;
  } else {
    metadata["Content-Type"] = mime
  }

  // compress into gzip using node zopfli, only keep if better
  const compressed = zopfli.gzipSync(content, {
    // adaptative number of iteration depending on file size
    numiterations:
      content.byteLength > 5_000_000
        ? 5
        : content.byteLength > 2_000_000
        ? 10
        : 15,
  })
  if (compressed.byteLength < insertionBytes.byteLength) {
    insertionBytes = compressed
    metadata["Content-Encoding"] = "gzip"
  }

  // chunk the file
  const chunks = chunkFile(insertionBytes, chunkSize)
  // encode the metadata
  const metadataEncoded = encodeFileMetadata(metadata)
  // compute the file unique identifier, following the onchfs specifications:
  // keccak( 0x01 , keccak( content ), keccak( metadata ) )
  const contentHash = keccak("keccak256").update(insertionBytes).digest()
  const metadataHash = keccak("keccak256")
    .update(Buffer.concat(metadataEncoded))
    .digest()
  const cid = keccak("keccak256")
    .update(
      Buffer.concat([INODE_BYTE_IDENTIFIER.FILE, contentHash, metadataHash])
    )
    .digest()

  return {
    type: "file",
    cid,
    chunks,
    metadata: metadataEncoded,
  }
}

type PrepareDirectoryFile = {
  type: "file"
  name: string
  content: Buffer
  parent: PrepareDirectoryDir
  inode?: FileInode
}

type PrepareDirectoryDir = {
  type: "directory"
  files: {
    [name: string]: PrepareDirectoryNode
  }
  parent: PrepareDirectoryDir | null
  inode?: DirectoryInode
}

type PrepareDirectoryNode = PrepareDirectoryFile | PrepareDirectoryDir

/**
 * Builds a graph from a list of files (relative path from the directory root,
 * content) in a folder structure as it's going to be inscribed on the file
 * system.
 * @param files A list of the files (& their content), where paths are specified with separating "/"
 * @returns A tuple of (graph, leaves), where graph is a structure ready to be
 * parsed for insertion & leaves the leaves of the graph, entry points for
 * parsing the graph in reverse.
 */
function buildDirectoryGraph(
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
    const parts = formattedPath.split("/")
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

function computeDirectoryInode(dir: PrepareDirectoryDir): DirectoryInode {
  const acc: Buffer[] = []
  const filenames = Object.keys(dir.files).sort()
  const dirFiles: { [name: string]: INode } = {}
  for (const filename of filenames) {
    const inode = dir.files[filename].inode!
    dirFiles[filename] = inode
    // push filename hashed
    acc.unshift(keccak("keccak256").update(filename).digest())
    // push target inode cid
    acc.unshift(inode.cid)
  }
  // add indentifying byte at the beginning
  acc.unshift(INODE_BYTE_IDENTIFIER.DIRECTORY)
  return {
    type: "directory",
    cid: keccak("keccak256").update(Buffer.concat(acc)).digest(),
    files: dirFiles,
  }
}

type InscriptionChunk = {
  type: "chunk"
  content: Buffer
}

type InscriptionFile = {
  type: "file"
  metadata: Buffer[]
  chunks: Buffer[]
}

type InscriptionDirectory = {
  type: "directory"
  files: {
    [name: string]: Buffer
  }
}

export type Inscription =
  | InscriptionChunk
  | InscriptionFile
  | InscriptionDirectory

/**
 * Traverse the inverted tree starting by the root, creating inscriptions as
 * it's being traversed. At the end of the flow the inscriptions will be
 * reversed to ensure they are written to the store in the right order (as the
 * onchfs will reject inodes pointing to inexisting resources; let it be file
 * chunks or directory files).
 * @param root The root of the tree, can be either the root directory or a file
 * @returns A list of inscription objects ready to be turned into operations
 */
export function generateInscriptions(root: INode): Inscription[] {
  const inscriptions: Inscription[] = []
  const traverse = (node: INode) => {
    if (node.type === "directory") {
      inscriptions.push({
        type: "directory",
        files: Object.fromEntries(
          Object.keys(node.files).map(name => [name, node.files[name].cid])
        ),
      })
      // recursively traverse each inode of the directory
      for (const name in node.files) {
        traverse(node.files[name])
      }
    } else if (node.type === "file") {
      // create the first inscription first as it will be reversed in the end,
      // so the chunk inscriptions will appear first
      inscriptions.push({
        type: "file",
        chunks: node.chunks.map(chk => chk.hash),
        metadata: node.metadata,
      })
      for (const chunk of node.chunks) {
        inscriptions.push({
          type: "chunk",
          content: chunk.bytes,
        })
      }
    }
  }
  traverse(root)
  return inscriptions.reverse()
}
