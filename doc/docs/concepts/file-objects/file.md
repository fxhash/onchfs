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

The file metadata is designed to facilitate the delivery of the file content through the http protocol. The metadata is a list of bytes, each item in the list being a field of the metadata. The first 2 bytes of each item are used to encode the type of the field, while following bytes contain the value of the field, encoded in 7-bit ASCII.

This is the visual representation of a metadata field bytes ordering:

```
  0   1   ...
+---+---+======================+
|  ID1  | MVALUE               |
+---+---+======================+

ID1: Metadata field identifcation prefix
MVALUE: Metadata field value, encoded in 7-bit ASCII
```

This is the list of the supported metadata fields, referenced by their identifying prefix bytes:

| Identifying bytes | Corresponding field type                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `0x0000`          | [Content-Type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type)   |
| `0x0001`          | [Content-Encoding](https://www.notion.so/onchfs-d55a59ae7b334502a3a8c6afd3360291?pvs=21) |

For now, these are the only supported metadata fields. These fields will be used for delivering the file data with the right http headers in responses.
