# Directories

An inode directory will store a list of (name → inode CID). A name in a inode directory must be unique. Different names can point to the same inode CID, as many paths can point to a given resource. Referenced inodes can either be directories (for nested structures) or files (leaves of a file tree).

```
directory example
{
	"index.html": 0x56da...87f5, // inode file
	"main.js": 0xd2e8...b1ed,    // inode file
	"includes": 0x63c3...f65a,   // inode directory
}
```

- Names **must be at least 1 character long**.
- Names **in a directory must be unique**.
- Names **are alphabetically ordered**.
- Names are strictly restricted to the 7-bit printable ASCII (US ASCII) character set. Unicode characters can be encoded in UTF-8 using a percent-based encoding as defined in RFC 3986. While the protocol will only accept characters in the 7-bit ASCII range, proxies & front-end application can decode URIs into Unicode using ASCII for human readability. Dynamic content such as html can also use UTF-8 characters to reference other resources in the file system, as browsers will naturally encode such paths when querying the server.
- The **following characters are reserved and cannot be used as part of the name**: `:/?#[]@!$&'()*+,;=`, as these are part of the [reserved character set for constructing URIs in RFC 3986](https://datatracker.ietf.org/doc/html/rfc3986#section-2.2). As file system paths will be used to uniquely identify and read resources from the file system using the http protocol, the paths in the file system cannot collide with the URIs.

## Hashing a directory

The CID of a directory is computed by hashing its content in such a way:

```
hash_chunks = []
for (name, cid) in directory_entries   # entries are alphabetically ordered
  hash_chunks = [
    cid,             # fixed-length 32 bytes inode CID
    keccak( name ),  # hash the file name
    ...hash_chunks
  ]
cid = keccak(
  concat(
    bytes(0x00), # identifying byte to avoid collisions with files
    hash_chunks
  )
)
```

This hashing strategy ensures that a slight change in a directory (file name, cid pointer) will yield a different CID. Moreover, there cannot be collisions with this design as long as keccak cannot be exploited.
