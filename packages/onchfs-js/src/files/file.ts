import { gzip } from "pako"
import { DEFAULT_CHUNK_SIZE, INODE_BYTE_IDENTIFIER } from "@/config"
import { FileMetadataEntries, encodeFileMetadata } from "./metadata"
import { FileInode } from "@/types"
import { lookup as lookupMime } from "mime-types"
import { chunkBytes } from "./chunks"
import { concatUint8Arrays, keccak } from "@/utils"
// import { fileTypeFromBuffer } from "file-type"
import { CID } from "multiformats/cid"
import { from } from "multiformats/hashes/hasher"
import { sha3_256 } from "js-sha3"

const m = async () => {
  const content = new Uint8Array(256)
    .fill(0)
    .map(() => Math.floor(Math.random() * 256))
  const hash = sha3_256.digest(content)

  const hasher = from({
    name: "keccak-256",
    code: 0x1b,
    encode: input => keccak(input),
  })

  const hash2 = await hasher.digest(content)
  console.log(hash2)

  const cid = CID.createV1(0x00, hash2)
  console.log(cid)
}
m()

// const cid = CID.create(1, 0x01, {
//   code: 0x1b,
//   bytes: hash,
//   size: 32,
//   digest: hash,
// })

// console.log(cid.bytes)

// console.log(CID.inspectBytes(cid.bytes))

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
  content: Uint8Array,
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
  const compressed = gzip(content)
  if (compressed.byteLength < insertionBytes.byteLength) {
    insertionBytes = compressed
    metadata["Content-Encoding"] = "gzip"
  }

  // chunk the file
  const chunks = chunkBytes(insertionBytes, chunkSize)
  // encode the metadata
  const metadataEncoded = encodeFileMetadata(metadata)
  // compute the file unique identifier, following the onchfs specifications:
  // keccak( 0x01 , keccak( content ), keccak( metadata ) )
  const contentHash = keccak(insertionBytes)
  const metadataHash = keccak(concatUint8Arrays(...metadataEncoded))
  const cid = keccak(
    concatUint8Arrays(INODE_BYTE_IDENTIFIER.FILE, contentHash, metadataHash)
  )

  return {
    type: "file",
    cid,
    chunks,
    metadata: metadataEncoded,
  }
}
