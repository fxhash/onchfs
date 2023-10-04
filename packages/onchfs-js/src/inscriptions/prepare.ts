import { INode } from "@/types/files"
import { Inscription } from "@/types/inscriptions"

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
export function prepareInscriptions(root: INode): Inscription[] {
  const inscriptions: Inscription[] = []
  const traverse = (node: INode) => {
    if (node.type === "directory") {
      inscriptions.push({
        type: "directory",
        files: Object.fromEntries(
          Object.keys(node.files).map(name => [name, node.files[name].cid])
        ),
        cid: node.cid,
      })
      // recursively traverse each inode of the directory
      for (const name in node.files) {
        traverse(node.files[name])
      }
    } else if (node.type === "file") {
      // create the file inscription first as it will be reversed in the end,
      // so the chunk inscriptions will appear first
      inscriptions.push({
        type: "file",
        chunks: node.chunks.map(chk => chk.hash),
        metadata: node.metadata,
        cid: node.cid,
      })
      for (const chunk of node.chunks) {
        inscriptions.push({
          type: "chunk",
          content: chunk.bytes,
        })
      }
    }
  }
  traverse(root)
  return inscriptions.reverse()
}
