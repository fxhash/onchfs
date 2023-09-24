# URI

The `uri` module exposes utility functions to interact and process ONCHFS uris.

## Parsing a URI

The generic `parse()` method will take a string URI as an input and return an object with the various URI parts. As URIs sometimes need some context for their resolution, an optional context parameter can be provided for improving the resolution. The parsing is strict, as in if the URI is missing some parts which can be inferred by the context in which the URI exists, and if no such context is provided, the parsing will fail.

The resolution happens in 3 distinctive steps, each breaking down the
URI into smaller components which can be parsed more easily:

- **parseSchema**<br/>
  **`<onchfs>://<schema-specific-part>`**<br/>
  Splits the URI into it's 2 biggest sections, extracting the schema from the schema-specific part.
- **parseSchemaSpecificPart**<br/>
  **`[ authority "/" ] cid [path] [ "?" query ] [ "#" fragment ]`**<br/>
  Splits the schema-specific part into its various logical segments. This step validate the general structure of the URI as well.
- **parseAuthority**<br/>
  **`[ contract-address "." ] blockchain-name [ ":" chainid ]`**<br/>
  The authority segment is parsed, and using the context provided by the consumer it tries to resolve the authority.

```ts
// signature
function parse(uri: string, context?: URIContext): URIComponents

// usage
const components = onchfs.uri.parse(
  "onchfs://68b75b4e8439a7099e53045bea850b3266e95906.eth/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840"
)
```

## Interfaces

```ts
/**
 * List of the blockchain supported officially. While the protocol can be
 * deployed anywhere, the URI resolution is more easily inferred from the
 * supported deployments.
 */
export const blockchainNames = ["tezos", "ethereum"] as const
export type BlockchainNames = (typeof blockchainNames)[number]

/**
 * The URI Authority defines the "host" of an asset, in this case a combination
 * of a blockchain (represented by string indentifier & chain ID) & a contract
 * on such blockchain compliant to the onchfs specifications.
 */
export interface URIAuthority {
  blockchainName: string
  contract: string
  blockchainId: string
}

/**
 * Provides a full broken-down representation of the URI in a formatted way.
 * While the authority is an optionnal segment when writing an onchfs URI, it
 * must be inferred during the resolution by providing a context.
 */
export interface URIComponents {
  cid: string
  authority: URIAuthority
  path?: string
  query?: string
  fragment?: string
}

/**
 * Some URI Context needs to be provided for most URI resolutions, as often
 * onchfs URI will rely of the context in which they are stored/seen to infer
 * their resolution. For instance, a base onchfs URI stored on ETH mainnet will
 * expect solvers to point to the main onchfs ETH contract.
 */
export type URIContext = Pick<URIAuthority, "blockchainName"> &
  Pick<Partial<URIAuthority>, "blockchainId" | "contract">

/**
 * The different segments of the URI Schema-Specific Component:
 * [ authority "/" ] cid [path] [ "?" query ] [ "#" fragment ]
 */
export interface URISchemaSpecificParts {
  cid: string
  authority?: string
  path?: string
  query?: string
  fragment?: string
}
```
