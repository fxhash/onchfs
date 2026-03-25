import { gzip } from "pako"
import { lookup as lookupMime } from "mime-types"
import { chunkBytes } from "./chunks"
import { FileMetadataEntries } from "@/types/metadata"
import { encodeMetadata } from "@/metadata/encode"
import { FileInode, IFile, OnchfsPrepareOptions } from "@/types/files"
import { computeFileCid } from "@/cid"

const MIME_LOOKUP = {
  vert: "text/plain",
}

/**
 * Resolves the MIME type for a given filename.
 * @param {string} filename - The name of the file.
 * @returns {string|null} The determined MIME type or null if not found.
 */
function resolveMimeType(filename): string | null {
  let mime = lookupMime(filename)
  if (!mime) {
    // fallback to extension lookup
    const extension = filename.split(".").pop()
    if (extension && MIME_LOOKUP[extension]) {
      return MIME_LOOKUP[extension]
    }
    // return null if no MIME type is found
    return null
  }
  return mime
}

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
export function prepareFile(
  file: IFile,
  options: Required<OnchfsPrepareOptions>
): FileInode {
  const { path: name, content } = file
  let metadata: FileMetadataEntries = {}
  let insertionBytes = content
  // we use file extension to get mime type
  const mime = resolveMimeType(name)

  if (!mime) {
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

  // chunk the file, encode its metadata and compute its CID based on provided
  // hashing strategy
  const chunks = chunkBytes(insertionBytes, options.chunkSize)
  const metadataEncoded = encodeMetadata(metadata)
  const cid = computeFileCid(
    chunks,
    metadataEncoded,
    options.fileHashingStrategy
  )

  return {
    type: "file",
    cid,
    chunks,
    metadata: metadataEncoded,
    source: {
      content: file.content,
    },
  }
}
