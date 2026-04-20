# Files

The `files` module is the main module used to interact with raw files, as it allows processing files into graphs of object nodes which can later be manipulated by other components of ONCHFS.

## Prepare

Prepare is the main function for processing "raw files" into ONCHFS file objects. It supports 2 signatures, one for processing a **single file**:

```ts
// signature
function prepare(file: IFile, options?: OnchfsPrepareOptions): FileInode

// usage
const file = onchfs.files.prepare({
  path: "index.html", // just the name
  content: new Uint8Array([0, 255, 23, 456]), // bytes of content
})
```

And one for processing a directory, represented as a list of files each having a path relative to the root directory:

```ts
// signature
function prepare(files: IFile[], options: OnchfsPrepareOptions): DirectoryInode

// usage
const dir = onchfs.prepare([
  {
    path: "index.html",
    content: new Uint8Array([0, 255, 23, 456]),
  },
  {
    path: "lib/main.js",
    content: new Uint8Array([0, 255, 23, 456]),
  },
  {
    path: "style.css",
    content: new Uint8Array([0, 255, 23, 456]),
  },
])

/**
 * For the following directory structure:
 * .
 * ├── index.html
 * ├── style.css
 * └── lib/
 *     └── main.js
 */
```

### Options

| Name                       | Description                                                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| chunkSize<br/>**`number`** | _(Optional)_<br/>**Default:** `16384`<br/>Max number of bytes into which files can be chunked. The default number is recommend to ensure storage optimisation (as duplicate chunks are not copied when inserting). |

## Utils

### Chunk bytes

Splits some bytes (in most cases the content of a file) into multiple chunks of the same size (except if the remaining bytes of the last chunk don't cover a full chunk, in which case a smaller chunk is produced). Chunks are also hashed, as such this function returns tuples of (chunk, chunkHash).

_This utility function is internally called by `prepare()` and should only be used for low-level use-cases._

```ts
// signature
function chunkBytes(
  content: Uint8Array,
  chunkSize: number = DEFAULT_CHUNK_SIZE
): FileChunk[]

// usage
const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
const chunks = onchfs.files.utils.chunkBytes(bytes, 4)
// {
//   chunks: [ [0,1,2,3], [4,5,6,7], [8,9] ],
//   hash: Uint8Array(...),
// }
```

### Build directory graph

Builds a graph from a list of files (relative path from the directory root content) in a folder structure as it's going to be inscribed on the file system. Returns a tuple of (graph, leaves), where graph is a structure ready to be parsed for insertion & leaves the leaves of the graph, entry points for parsing the graph in reverse. Graph is directed and edges are reciprocated so that the
graph can be traversed either by the root or its leaves.

_This utility function is internally called by `prepare()` and should only be used for low-level use-cases._

```ts
// signature
export function buildDirectoryGraph(
  files: IFile[]
): [PrepareDirectoryDir, PrepareDirectoryFile[]]

// usage
const [root, leaves] = onchfs.files.utils.buildDirectoryGraph([
  {
    path: "index.html",
    content: Uint8Array(...),
  },
  {
    path: "style.css",
    content: Uint8Array(...),
  },
  {
    path: "lib/main.js",
    content: Uint8Array(...),
  },
  {
    path: "lib/math.js",
    content: Uint8Array(...),
  },
])

// produces:
              ┌────────┐
      ┌───────┤  root  ├───────┐
      │       └────┬───┘       │
      │            │           │
┌─────▼────┐  ┌────▼────┐   ┌──▼──┐
│index.html│  │style.css│ ┌─┤ lib ├──┐
└──────────┘  └─────────┘ │ └─────┘  │
                          │          │
                     ┌────▼──┐   ┌───▼───┐
                     │main.js│   │math.js│
                     └───────┘   └───────┘
// [
//   root,
//   [ index.html, styles.css, main.js, math.js ]
// ]
```

### Compute directory inode

Compute the different properties of a directory inode based on the preparation object, returns a valid directory inode.

_This utility function is internally called by `prepare()` and should only be used for low-level use-cases._

```ts
// signature
function computeDirectoryInode(dir: PrepareDirectoryDir): DirectoryInode

// usage
const dir = onchfs.files.utils.computeDirectoryInode(preparationDirectory)
```

### Encode filename

Encodes the filename in 7-bit ASCII, where UTF-8 characters are escaped. Will also escape any character that are not supported in the URI specification, as these will be fetched using a similar pattern by browsers. Characters outside of the supported set are percent-encoded. The native `encodeURIComponent()` method will be used for such a purpose.

```ts
// signature
function encodeFilename(name: string): string

// usage
const encoded = onchfs.files.utils.encodeFilename("wè!/rd@:.filename")
// output: 'w%C3%A8!%2Frd%40%3A.filename'
```

## Interfaces

```ts
type FileChunk = {
  bytes: Uint8Array
  hash: Uint8Array
}

type FileInode = {
  type: "file"
  chunks: FileChunk[]
  cid: Uint8Array
  metadata: Uint8Array
}

type DirectoryInode = {
  type: "directory"
  cid: Uint8Array
  files: {
    [name: string]: INode
  }
}

type INode = DirectoryInode | FileInode

type IFile = {
  path: string
  content: Uint8Array
}

/**
 * The Prepare typings are used to build a temporary graph for exploring a
 * directory structure, before it is turned into proper File Objects which can
 * be turned into inscriptions.
 */

type PrepareDirectoryFile = {
  type: "file"
  name: string
  content: Uint8Array
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

interface OnchfsPrepareOptions {
  chunkSize?: number
}
```
