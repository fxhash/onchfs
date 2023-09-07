"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inscriptionsStorageBytes = exports.generateInscriptions = void 0;
/**
 * Traverse the inverted tree starting by the root, creating inscriptions as
 * it's being traversed. At the end of the flow the inscriptions will be
 * reversed to ensure they are written to the store in the right order (as the
 * onchfs will reject inodes pointing to inexisting resources; let it be file
 * chunks or directory files).
 * @param root The root of the tree, can be either the root directory or a file
 * @returns A list of inscription objects ready to be turned into operations
 */
function generateInscriptions(root) {
    const inscriptions = [];
    const traverse = (node) => {
        if (node.type === "directory") {
            inscriptions.push({
                type: "directory",
                files: Object.fromEntries(Object.keys(node.files).map(name => [name, node.files[name].cid])),
            });
            // recursively traverse each inode of the directory
            for (const name in node.files) {
                traverse(node.files[name]);
            }
        }
        else if (node.type === "file") {
            // create the file inscription first as it will be reversed in the end,
            // so the chunk inscriptions will appear first
            inscriptions.push({
                type: "file",
                chunks: node.chunks.map(chk => chk.hash),
                metadata: node.metadata,
            });
            for (const chunk of node.chunks) {
                inscriptions.push({
                    type: "chunk",
                    content: chunk.bytes,
                });
            }
        }
    };
    traverse(root);
    return inscriptions.reverse();
}
exports.generateInscriptions = generateInscriptions;
/**
 * Compute the number of bytes an inscription will take on the storage.
 * @param ins Inscription for which storage space should be computed
 * @returns The number of storage bytes the inscription will take
 */
function inscriptionStorageBytes(ins) {
    switch (ins.type) {
        case "chunk":
            // chunk to write + chunk key
            return ins.content.byteLength + 32;
        case "directory":
            // for every file in directory:
            //  - 32 bytes for pointer
            //  - 1 byte per character (stored in 7-bit ASCII)
            // and 32 bytes for the directory pointer
            return (Object.keys(ins.files)
                .map(name => name.length + 32)
                .reduce((a, b) => a + b, 0) + 32);
        case "file":
            // 32 bytes per chunk + metadata + 32 bytes for pointer
            return (32 + // 32 bytes for pointer
                32 * ins.chunks.length + // 32 bytes per chunk
                ins.metadata.map(buf => buf.byteLength).reduce((a, b) => a + b, 0));
    }
}
/**
 * Computes the maximum number of storage bytes which will be consumed by the
 * inscriptions when they are written on-chain. This is a maximum value, as
 * some chunks/files/directories may already have been written to the storage.
 * Note: this doesn't include eventual gas execution fees, which are blockchain-
 * dependant.
 * @param inscriptions Inscriptions for which storage bytes will be computed
 * @returns Number of bytes the inscriptions may take on the storage
 */
function inscriptionsStorageBytes(inscriptions) {
    return inscriptions.reduce((acc, ins) => inscriptionStorageBytes(ins) + acc, 0);
}
exports.inscriptionsStorageBytes = inscriptionsStorageBytes;
//# sourceMappingURL=inscriptions.js.map