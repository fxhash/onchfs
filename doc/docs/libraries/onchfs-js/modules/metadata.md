# Metadata

The `metadata` module provides low level utilities to process ONCHFS file metadata.

## Encoding metadata

Encodes a JS object of metadata into bytes using HPACK compression algorithm. Only certain metadata entries are allowed.

```ts
// signature
function encode(metadata: FileMetadataEntries): Uint8Array

// usage
const encoded = onchfs.metadata.encode({
  "content-type": "application/javascript",
  "content-encoding": "gzip",
})
```

## Decoding metadata

Decodes bytes of metadata into a javascript object.

```ts
// signature
function decode(raw: Uint8Array): FileMetadataEntries

// usage
const decoded = onchfs.metadata.decode(encodedMetadataBytes)
```

:::info
As `encode()` is normalizing the input, `decode(encode(A)) != A`, but `decode(encode(A)) == normalize(A)`
:::

## Utils

### Validate Metadata Value

TODO

## Interfaces

```ts
export interface FileMetadataEntries {
  "content-type"?: string
  "content-encoding"?: "gzip" | "deflate" | "compress"
}
```
