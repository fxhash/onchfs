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

TODO

### Build directory graph

TODO

### Compute directory inode

TODO

### Encode filename

TODO
