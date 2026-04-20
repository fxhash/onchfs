# Files

An inode file will store:

- a list of Content-Store pointers, whose concatenated content form the file data
- some file metadata (data about the file’s data, such as encoding and content-type) **designed to facilitate serving the file over http**

This is an example of an inode file:

```
file
- chunk_pointers: [ 1ed06...ee60, cedf6...7674 ],
- metadata: [ 00d456da..., 01879dca... ]
```

Files **don’t have a name**, instead directories can create named pointers to files. A same file can have different names in different directories.

Files **must reference** existing chunks in the Content Store. When creating a file, a list of Content Store pointers is provided, and the File Objects contract fails if it cannot read the data under a given chunk.

## Hashing files

The hash of a file is computed in such a way:

```
fdata: concatenation of the file ordered chunks
mdata: concatenation of metadata fields

cid = keccak(
	concat(
		bytes(0x01),      # identifying byte to avoid collisions with directories
		keccak( fdata ),  # hash the file data
		keccak( mdata ),  # hash the metadata
	)
)
```

:::info
The file data is hashed as opposed to hashing the pointers of its chunks to ensure it reflects different chunks concatenating to the same data producing a same file content. ie concat(a, b, c) == concat(d, e) define the same data, yet the chunk pointers are different.
:::

As a consequence, a same file data with the same metadata will always have a same hash, however a same file data with different metadata will have a different hash. As such, a file hash points to a unique file (data, metadata) combination.

The metadata of a file is immutable, to _update_ the metadata of a file, another file must be created.

## File metadata

The file metadata is designed to facilitate the delivery of the file content through the http protocol. The metadata takes the form of some HTTP headers encoded with [HPACK, an HTTP2 specification](https://httpwg.org/specs/rfc7541.html) designed for encoding HTTP headers in a compact way.

On-chain, the compressed bytes are stored, and they are decoded when content needs to be delivered.

For instance, the following HTTP headers:

```json
{
  "content-type": "application/javascript",
  "content-encoding": "gzip"
}
```

Will be encoded to:

```
0x5f901d75d0620d263d4c741f71a0961ab4ff5a839bd9ab
```

While storage could have been improved, we opted for using a well-known specification, allowing for an easier integration of onchfs over time. It should be known that this solution isn't the most optimal storage-wise, but it's a trade-of worth taking when looking at long-term interoperability.
