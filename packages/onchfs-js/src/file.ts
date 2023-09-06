import zopfli from "node-zopfli"
import keccak from "keccak"
import { DEFAULT_CHUNK_SIZE, INODE_BYTE_IDENTIFIER } from "./config"
import { FileMetadataEntries, encodeFileMetadata } from "./metadata"
import { FileInode } from "./types"
import { lookup as lookupMime } from "mime-types"
import { chunkBytes } from "./chunks"
// import { fileTypeFromBuffer } from "file-type"

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
  content: Buffer,
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
  const compressed = zopfli.gzipSync(content, {
    // adaptative number of iteration depending on file size
    numiterations:
      content.byteLength > 5_000_000
        ? 5
        : content.byteLength > 2_000_000
        ? 10
        : 15,
  })
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
  const contentHash = keccak("keccak256").update(insertionBytes).digest()
  const metadataHash = keccak("keccak256")
    .update(Buffer.concat(metadataEncoded))
    .digest()
  const cid = keccak("keccak256")
    .update(
      Buffer.concat([INODE_BYTE_IDENTIFIER.FILE, contentHash, metadataHash])
    )
    .digest()

  return {
    type: "file",
    cid,
    chunks,
    metadata: metadataEncoded,
  }
}
