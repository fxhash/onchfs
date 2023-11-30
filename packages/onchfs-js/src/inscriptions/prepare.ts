import { FileChunk, INode } from "@/types/files"
import { Inscription } from "@/types/inscriptions"
import { u8hex } from "@/utils/uint8"

interface InsPrepResolver {
  inodeExists: (cid: string) => Promise<boolean>
  chunkExists: (cid: string) => Promise<boolean>
}

/**
 * Traverse the inverted tree starting by the root, creating inscriptions as
 * it's being traversed. At the end of the flow the inscriptions will be
 * reversed to ensure they are written to the store in the right order (as the
 * onchfs will reject inodes pointing to inexisting resources; let it be file
 * chunks or directory files).
 *
 * @example
 *
 * ```ts
 * // first prepare the file(s)
 * const F = onchfs.files.prepare({
 *   content: [],
 *   path: "index.html"
 * })
 * // ot
 * const F = onchfs.files.prepare([
 *   {
 *     content: [],
 *     path: "index.htmml"
 *   },
 *   {
 *     content: [],
 *     path: "lib/main.js"
 *   }
 * ])
 *
 * // the prepare the inscriptions
 * const inscriptions = onchfs.inscriptions.prepare(F) // file or directory
 * ```
 *
 * @param root The root of the tree, can be either the root directory or a file
 *
 * @returns A list of inscription objects ready to be turned into operations
 */
export function prepareInscriptions(root: INode): Inscription[]

/**
 * Traverse the inverted tree starting by the root, creating inscriptions as
 * it's being traversed. Before inscriptions are added to the final list, they
 * are checked against the provided resolution function to see if they are
 * already inscribed. If so, there is not need to inscribe them. At the end of
 * the flow the inscriptions will be reversed to ensure they are written to the
 * store in the right order (as the onchfs will reject inodes pointing to
 * inexisting resources; let it be file chunks or directory files).
 *
 * @example
 *
 * ```ts
 * // first prepare the file(s)
 * const F = onchfs.files.prepare({
 *   content: [],
 *   path: "index.html"
 * })
 * // ot
 * const F = onchfs.files.prepare([
 *   {
 *     content: [],
 *     path: "index.htmml"
 *   },
 *   {
 *     content: [],
 *     path: "lib/main.js"
 *   }
 * ])
 *
 * // the prepare the inscriptions
 * const inscriptions = await onchfs.inscriptions.prepare(F, {
 *   async inodeExists(cid) {
 *     // just an example, implementation will vary depending use-cases
 *     // this should return true|false depending on the existance of the inode
 *     return indexer.onchfs.hasInode(cid)
 *   },
 *   async chunkExists(cid) {
 *     return indexer.onchfs.chunkExists(cid)
 *   }
 * })
 * ```
 *
 * @param root The root of the tree, can be either the root directory or a file
 *
 * @returns A list of inscription objects ready to be turned into operations
 */
export function prepareInscriptions(
  root: INode,
  resolver: InsPrepResolver
): Promise<Inscription[]>

export function prepareInscriptions(
  root: INode,
  resolver?: InsPrepResolver
): Inscription[] | Promise<Inscription[]> {
  const inscriptions: Inscription[] = []

  // no async resolution of the inodes/chunk; assume insert all
  if (typeof resolver === "undefined") {
    const traverse = (node: INode) => {
      if (node.type === "directory") {
        inscriptions.push(createInscription(node))
        // recursively traverse each inode of the directory
        for (const name in node.files) {
          traverse(node.files[name])
        }
      } else if (node.type === "file") {
        // create the file inscription first as it will be reversed in the end,
        // so the chunk inscriptions will appear first
        inscriptions.push(createInscription(node))
        for (const chunk of node.chunks) {
          inscriptions.push(createInscription(chunk))
        }
      }
    }
    traverse(root)
    return inscriptions.reverse()
  }
  // resolver is defined, return a promise and check for inscriptions existing
  else {
    return new Promise(async resolve => {
      const traverse = async (node: INode) => {
        // check if inode exists, if so we are done with this segment of graph
        if (node.type === "directory" || node.type === "file") {
          let found = false
          try {
            found = await resolver.inodeExists(u8hex(node.cid))
          } catch (e) {}
          if (found) return
        }

        if (node.type === "directory") {
          inscriptions.push(createInscription(node))
          // recursively traverse each inode of the directory
          for (const name in node.files) {
            await traverse(node.files[name])
          }
        } else if (node.type === "file") {
          inscriptions.push(createInscription(node))

          // check all the chunks at once, then filter those which need insert
          const results = await Promise.allSettled(
            node.chunks.map(chunk => resolver.chunkExists(u8hex(chunk.hash)))
          )
          const chunksToInsert = node.chunks.filter((_, i) => {
            const res = results[i]
            return res.status === "fulfilled" && !res.value
          })

          for (const chunk of chunksToInsert) {
            inscriptions.push(createInscription(chunk))
          }
        }
      }
      await traverse(root)
      resolve(inscriptions.reverse())
    })
  }
}

/**
 * Creates an inscription matching with the given node/chunk.
 * @param node The node, either an INode or a file chunk
 * @returns The inscription corresponding to the node
 */
function createInscription(node: INode | FileChunk): Inscription {
  if ("type" in node) {
    if (node.type === "directory") {
      return {
        type: "directory",
        files: Object.fromEntries(
          Object.keys(node.files).map(name => [name, node.files[name].cid])
        ),
        cid: node.cid,
      }
    } else if (node.type === "file") {
      return {
        type: "file",
        chunks: node.chunks.map(chk => chk.hash),
        metadata: node.metadata,
        cid: node.cid,
      }
    }
  } else {
    return {
      type: "chunk",
      content: node.bytes,
      hash: node.hash,
    }
  }
  throw new Error("Unknown node type")
}
