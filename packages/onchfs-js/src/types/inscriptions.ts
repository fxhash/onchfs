export type InscriptionChunk<DataEncoding = Uint8Array> = {
  type: "chunk"
  content: DataEncoding
}

export type InscriptionFile<DataEncoding = Uint8Array> = {
  type: "file"
  metadata: DataEncoding
  chunks: DataEncoding[]
  cid: Uint8Array
}

export type InscriptionDirectory<DataEncoding = Uint8Array> = {
  type: "directory"
  files: {
    [name: string]: DataEncoding
  }
  cid: Uint8Array
}

export type Inscription<DataEncoding = Uint8Array> =
  | InscriptionChunk<DataEncoding>
  | InscriptionFile<DataEncoding>
  | InscriptionDirectory<DataEncoding>
