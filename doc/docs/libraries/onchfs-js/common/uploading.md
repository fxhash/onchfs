# Uploading a file/directory to ONCHFS

```ts
// prepare a file
const node = onchfs.files.prepare(bytes, filename)

// OR prepare a directory
const node = onchfs.files.prepare([
  { path: "index.html", content: bytes0 },
  { path: "style.css", content: bytes1 },
  { path: "lib/main.js", content: bytes3 },
  { path: "lib/processing.min.js", content: bytes4 },
])

// generate inscriptions from node
const inscriptions = await onchfs.inscriptions.prepare(file, {
  // if an inode with such CID is found the optimizer will remove the relevant
  // inscriptions.
  getInode: async cid => {
    return await blockchainNode.getInode(cid)
  },
})
```
