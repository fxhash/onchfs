# Resolver

The `resolver` module can be used to easily create a resource resolver for ONCHFS. As ONCHFS is stricly specified at an abstract blockchain-agnostic level, any ONCHFS-compatible system on any blockchain can have its resources resolved in a similar fashion.

There are 2 ways to create a ONCHFS proxy resolver:

- `simple`: declarative configuration of the resource endpoints, exposing a simple `resolve()` function
- `custom`: requires a configuration object which defines functions which will get executed during the resolution execution flow.

## Creating a simple resolver

Creates a basic proxy resolver using a declarative list of blockchain resolvers (network, RPC addresses, etc...). This function is a wrapper over the lower level `proxy.createRaw()` function. It provides a basic implementation of ONCHFS resolution using the declarative inputs which provide endpoints for the fetch operations.

This function returns a function which can be used to resolve URIs. This function returns a Promise which resolves with a list of properties meant to serve the content over http:

- `headers`: a map of the http headers associated with the content
- `content`: raw bytes representing the content to serve
- `status`: the http response status code

This function automatically handles error (resource not found, URI malformed...) and provides an appropriate HTTP status code as well as an HTML document to display the error. It makes integration into existing frameworks quite simple from the ground up.

The function takes a list of _controllers_ (for the lack of a better name) which provide details on the external resources which can be used to resolving the fetch operations. If the [authority](/docs/concepts/uris) part of the given URI is not provided, it will loop through every blockchain available until the resource is found (or not in which case it throws a 404).

```ts
// signature
function createProxyResolver(
  controllers: BlockchainResolverCtrl[]
): (uri: string) => Promise<ProxyResolutionResponse>

interface ProxyResolutionResponse {
  status: ProxyResolutionStatus
  content: Uint8Array
  headers: ProxyHttpHeaders
  error?: ProxyResolutionError
}

// usage
// setup resolver
const resolve = onchfs.resolver.create([
  {
    blockchain: "tezos:mainnet",
    rpcs: ["https://rpc1.fxhash.xyz", ...],
  },
  // ... more if desired
])
// it can resolve a URI
const response = await resolve(uri) // { headers, status, content }
```

:::info Fulle example
If you want to see a full example of a onchfs proxy server, [see Proxy server](/docs/libraries/onchfs-js/common/proxy-server).
:::

## Creating a custom resolver

Creates a generic-purpose URI resolver, leaving the implementation of the file system resource resolution to the consumer of this API. The resolver is a function of URI, which executes a series of file system operations based on the URI content and the responses from the file system.

This function takes an object with 2 functions as argument:

- `getInodeAtPath(cid, path, authority?)`: given some resource location details, run fetch operations against the file system and return the output
- `readFile(cid, chunkPointers, authority?)`: given some file details, make the necessary queries against the file system to get the file details (content + metadata)

This strategy is quite useful when a custom resolution implementation is desired. **For instance, at fxhash we use this strategy for a temporary file system stored on S3**.

This function handles the http response in any case (similarly to the basic `proxy.create()` function).

```ts
// signature
function createRawProxyResolver(
  resolver: Resolver
): (uri: string) => Promise<ProxyResolutionResponse>

// usage
const resolve = onchfs.proxy.createRaw({
  async getInodeAtPath(cid, path, authority) {
    // make requests to the file system (on a blockchain for instance)
  },
  async readFile(cid, chunkPointers, authority) {
    // make requests to the FS
  },
})
const response = await resolve(uri) // { headers, status, content }
```

## Interfaces

```ts
interface BlockchainResolverCtrl {
  blockchain: BlockchainNetwork
  rpcs: string[]
  contract?: string
}

type ResolverContractDecorator = (address?: string) => Resolver

interface BlockchainResolver {
  blockchain: BlockchainNetwork
  resolverWithContract: ResolverContractDecorator
}

interface InodeFileNativeFS {
  cid: string
  metadata: string | Uint8Array
  chunkPointers: string[]
}

interface InodeDirectoryNativeFS {
  cid: string
  files: Record<string, string>
}

type InodeNativeFS = InodeFileNativeFS | InodeDirectoryNativeFS

interface Resolver {
  getInodeAtPath: (
    cid: string,
    path: string[],
    authority?: URIAuthority
  ) => Promise<InodeNativeFS | null>
  readFile: (
    cid: string,
    chunkPointers: string[],
    authority?: URIAuthority
  ) => Promise<string | Uint8Array>
}

enum ProxyResolutionStatusErrors {
  NOT_ACCEPTABLE = 406,
  NOT_FOUND = 404,
  BAD_REQUEST = 400,
  INTERNAL_SERVER_ERROR = 500,
}

enum ProxyResolutionStatusSuccess {
  OK = 200,
}

enum ProxyResolutionStatusRedirect {
  PERMANENT = 308,
}

type ProxyResolutionStatus =
  | ProxyResolutionStatusSuccess
  | ProxyResolutionStatusErrors
  | ProxyResolutionStatusRedirect

interface ProxyResolutionError {
  code: number
  name: string
  message?: string
}

interface ProxyExtraHeaders {
  Location: string
}

type ProxyHttpHeaders = FileMetadataEntries | ProxyExtraHeaders

interface ProxyResolutionResponse {
  status: ProxyResolutionStatus
  content: Uint8Array
  headers: ProxyHttpHeaders
  error?: ProxyResolutionError
}
```
