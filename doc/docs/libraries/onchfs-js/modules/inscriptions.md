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

## Batch

Given a list of inscriptions, creates batches of inscriptions where each batch is under the batch size limit, using a safety delta of 10% of batch size. Each batch in the output will be under the given batch size, ensuring writting all the inscriptions in the batch will not overflow the batch size.

It is recommended to provide the operation bytes limit of the target blockchain as 2nd parameter.

**This function is really useful to optimize blockchain transactions, as sending 1 operation / inscription is not optimized.** It implies a strategy is available to insert multiple operations at once.

```ts
// signature
export function batch(
  inscriptions: Inscription[],
  batchSize: number
): Inscription[][]

// usage
const inscriptions = onchfs.inscriptions.prepare(files)
const batches = onchfs.inscriptions.batch(inscriptions, 40_000)
// ex: write each inscription batch using the smart contract
for (const batch of batches) {
  await writeInscriptions(batch)
}
```

## Inscriptions bytes length

Computes the maximum number of storage bytes which will be consumed by the inscriptions when they are written on-chain. This is a maximum value, as some chunks/files/directories may already have been written to the storage. Note: this doesn't include eventual gas execution fees, which are blockchain- dependant.

_Note: this may not equal the actual operation costs as gas is not included, moreover if inscriptions already exist no storage is consumed by the contract._

```ts
// signature
function inscriptionsBytesLength(inscriptions: Inscription[]): number

// usage
const inscriptions = onchfs.inscriptions.prepare(files)
const byteLength = onchfs.inscriptionsBytesLength(inscriptions)
```

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
