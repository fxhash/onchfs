# Inscriptions

The `inscriptions` module is designed for generating inscriptions (list of operations for inscribing data on ONCHFS) from a file or directory.

## Prepare

Traverse a graph of file nodes (returned by `files.prepare()`), starting by the root, creating inscriptions as it's being traversed. At the end of the traverse the inscriptions are reversed so that their order matches the order expected by ONCHFS.

```ts
// signature
function prepareInscriptions(root: INode): Inscription[]

// usage
const file = onchfs.files.prepare(...)
const inscriptions = onchfs.inscriptions.prepare(file)
```

As each application uses different strategies for sending operations on-chain, the ONCHFS library doesn't provide any layer for sending the inscriptions to the desired blockchain.

## Inscriptions bytes length

TODO

## Interfaces

```ts
export type InscriptionChunk<DataEncoding = Uint8Array> = {
  type: "chunk"
  content: DataEncoding
}

export type InscriptionFile<DataEncoding = Uint8Array> = {
  type: "file"
  metadata: DataEncoding
  chunks: DataEncoding[]
}

export type InscriptionDirectory<DataEncoding = Uint8Array> = {
  type: "directory"
  files: {
    [name: string]: DataEncoding
  }
}

export type Inscription<DataEncoding = Uint8Array> =
  | InscriptionChunk<DataEncoding>
  | InscriptionFile<DataEncoding>
  | InscriptionDirectory<DataEncoding>
```
