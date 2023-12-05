import {
  DirectoryInode,
  FileChunk,
  FileInode,
  FileUploadProgress,
  Inscription,
  UploadProgress,
  UploadSummary,
} from ".."

/**
 * Given a directory inode, computes an upload summary based on the inscriptions
 * which are missing for the directory to be fully uploaded.
 * @param node The Directory node for which the summary needs to be computed.
 * @param missingInscriptions The inscriptions which need to be inscribed for
 * the directory to be fully uploaded.
 */
export function directoryUploadSummary(
  node: DirectoryInode,
  missingInscriptions: Inscription[]
): UploadSummary {
  const files: FileUploadProgress[] = []
  const extra: UploadProgress = {
    total: 0,
    left: 0,
  }
  const global: UploadProgress = {
    total: 0,
    left: 0,
  }

  // recursively parse a directory (& sub-directories) while populating the
  // upload summary as files are being traversed
  function parse(node: DirectoryInode, path = "") {
    for (const name in node.files) {
      const N = node.files[name]
      if (N.type === "file") {
        const progress = fileUploadProgress(N, missingInscriptions)
        files.push({
          path: path + name,
          progress,
        })
        global.total += progress.total
        global.left += progress.left
      } else if (N.type === "directory") {
        parse(N, path + name + "/")
      } else {
        throw new Error("unsupported node type, this should never be reach!")
      }
    }

    if (
      missingInscriptions.find(
        ins => ins.type === "directory" && ins.cid === node.cid
      )
    ) {
      //todo: this suppose node.files.name < 32 bytes, but it could be improved
      // by computing the accurate size here
      const dirSize = Object.keys(node.files).length * 32 * 2 + 32
      extra.total += dirSize
      extra.left += dirSize
      global.total += dirSize
      global.left += dirSize
    }
  }
  parse(node)

  return {
    global,
    files,
    extraPayload: extra,
  }
}

/**
 * Given a file node and some missing inscriptions, computes the progress of
 * the upload on Onchfs.
 * @param node File node
 * @param missingInscriptions A list of inscriptions which are missing for the
 * file to be fully uploaded. Inscriptions are not strictly constrained to being
 * part of the file, they can be a bigger set of inscriptions wherein the file
 * inscriptions are contained.
 * @returns Progress details about the file upload.
 */
export function fileUploadProgress(
  node: FileInode,
  missingInscriptions: Inscription[]
): UploadProgress {
  // chunk bytes, 2x the chunk hashes (for storing chunks + for referencing
  // chunk in the file), the file hash
  const total =
    node.chunks.reduce((acc, chunk) => acc + chunk.bytes.length, 0) +
    // add the size of storing 2x chunk hashes
    node.chunks.length * 2 * 32 +
    // the hash of the file
    32

  // if the file exists in the inscriptions, we can just return full upload
  if (
    !missingInscriptions.find(
      ins => ins.type === "file" && ins.cid === node.cid
    )
  ) {
    return {
      total,
      left: 0,
    }
  }

  // find the chunks which are missing for the inscription
  const missingChunks: FileChunk[] = []
  for (const chunk of node.chunks) {
    if (
      missingInscriptions.find(
        ins => ins.type === "chunk" && ins.hash === chunk.hash
      )
    ) {
      missingChunks.push(chunk)
    }
  }

  return {
    total,
    left:
      missingChunks.reduce((acc, chunk) => acc + chunk.bytes.length, 0) +
      // for each chunk, we need to store chunk hash
      missingChunks.length * 32 +
      // file node must reference all the chunks
      node.chunks.length * 32 +
      // file cid pointer
      32,
  }
}
