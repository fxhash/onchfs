# JS Library

ONCHFS JS library provides a set of utility functions making any interaction with onchfs much easier.

## Getting started

```bash
npm i onchfs
```

## Usage

```ts
import onchfs from "onchfs"

// dot notation hierarchy
onchfs.files.prepare(...)
```

Functions of the package are stateless and grouped into _modules_ based on their utility. Modules are exposed under the root of the package and can be exposed using dot notation (`onchfs.<module_name>.<function>`). Examples:

```ts
onchfs.files.prepare(...)
onchfs.inscriptions.prepare(...)
onchfs.metadata.encode(...)
```

Some modules have utility functions grouped into submodules for a better organization of the API, as such submodules are lower level utilities which are uncommon in most cases. Examples:

```ts
onchfs.files.utils.chunkBytes(...)
onchfs.files.utils.buildDirectoryGraph(...)
onchfs.uri.utils.parseAuthority()
onchfs.uri.utils.parseSchemaSpecificPart(...)
```

You can read more about each individual module and the functions they expose on their respective pages:

- [files](./files)
- [inscriptions](./inscriptions)
- [metadata](./metadata)
- [resolver](./resolver)
- [uri](./uri)

## Most common operations

### Uploading a file/directory to ONCHFS

```ts
// prepare a file
const node = onchfs.files.prepare(bytes, filename)

// OR prepare a directory
const node = onchfs.files.prepare([
  { path: "index.html", content: bytes0 },
  { path: "style.css", content: bytes1 },
  { path: "lib/main.js", content: bytes3 },
  { path: "lib/processing.min.js", content: bytes4 },
])

// generate inscriptions from node
const inscriptions = await onchfs.inscriptions.prepare(file, {
  // if an inode with such CID is found the optimizer will remove the relevant
  // inscriptions.
  getInode: async cid => {
    return await blockchainNode.getInode(cid)
  },
})
```

### Proxy server

*Express js is used here as an example but the resolver is framework-agnostic, as such any server implementation can be used.* 

```ts
import onchfs from "onchfs"
import express from "express"

const app = express()

// setup resolver
const resolver = onchfs.resolver.create([
  {
    blockchain: "tezos:mainnet",
    rpcs: ["https://rpc1.fxhash.xyz", "..."],
  },
  // ... more if desired
])

app.use(async (req, res, next) => {
  // resolve a URI
  const response = await resolver.resolve(req.path)
  // response can be used as is for http
  return res
    .header(response.headers)
    .status(response.status)
    .send(Buffer.from(response.content))
})

app.listen(4000)
```

### Encoding/Decoding metadata

```ts
/**
 * Working with metadata
 */
const encoded = onchfs.metadata.encode(...)
const decoded = onchfs.metadata.decode(...)


/**
 * Writing a proxy
 */

const resolver = onchfs.resolver.create(
  // a list of resolver, order matters as if an URI without an authority has to
  // be resolved, each network will be tested until the resource is found on one
  [
    {
      blockchain: "tezos:mainnet",
      rpcs: ["https://rpc1.fxhash.xyz", "..."]
    },
    {
      blockchain: "tezos:ghostnet",
      rpcs: ["https://rpc1.fxhash-dev.xyz", "..."],
      // optional, the blockchain default one will be used by default
      contract: "KT..."
    },
  ]
)

app.use(async (req, res, next) => {
  const response = await resolver.resolve(req.path)
  // ...
})

// also possible to create a custom resolver with low-level primitives
const resolver = onchfs.resolver.custom({
  getInode: async (cid, path) => {
    // handle
  },
  getFile: async (cid) => {
    // handle
  }
})

/**
 * URI
 */

const components = onchfs.uri.parse("onchfs://...")

```
