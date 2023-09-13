# Resource URIs

URIs are sequences of characters identifying resources in the protocol. ONCHFS URIs follow the [RFC 3986](https://datatracker.ietf.org/doc/html/rfc3986) standard for URIs.

More specifically, onchfs URIs align with the [RFC 1736](https://datatracker.ietf.org/doc/html/rfc1738) standard for URLs, so that browsers can naturally interact with resources on ONCHFS through a proxy as if they were interacting with a regular http server.

Simply put, URIs are constructed as following:

```
onchfs://[<authority> /]<cid>[<path>][? <query>][# <fragment>]
```

See at the bottom of the document for the [ABNF definition of onchfs uris](#abnf).

## Outside the protocol

Resources loaded outside of the onchfs protocol should always specify the schema name (`onchfs://`) at the beginning of the URI, as to specifically identify the target as part of the file system.

## Inside the protocol

Resources inside the file system, such as html files, **MUST omit the schema** when they reference/load other resources, as it’s implied in the context. Moreover, this mechanism ensures native browser features can resolve URLs naturally.

Dynamic resources can load other resources using relative or absolute paths.

### Relative paths

If a resource is stored at `/3da4...6d76/some-folder/index.html`, then it can use relative paths to point to other resources in the file system. For instance:

```html
<!--
Will point to /3da4...6d76/some-folder/script.js
-->
<script src="./script.js"></script>

<!-- 
Will point to /3da4...6d76/some-folder/lib/processing.min.js, which may or may 
not have been uploaded fully during the inscription of the project (it may be a 
reference to an existing asset)
-->
<script src="./lib/processing.min.js"></script>
```

:::warning
It is **strictly forbidden** for assets inside the file system to reference other assets not exposed inside their root directory. It cannot be guaranteed that a solver can resolve assets pointed in such a way, such references are **considered to be unsafe**.
:::

### Absolute paths

Absolute paths such as `/3da4...6d76/index.js` are forbidden, although they may be resolved at runtime.

:::info
If a project requires other assets previously written to the file system, they should create a reference to the inodes in question inside their directory, ensuring every project is fully self-contained.
:::

## Resource resolution

Resources are resolved from the URI simply by using the `<cid>/<path>`. The `cid` is used to find the root inode, from which the `path` can be resolved by navigating the tree of inodes. The resource can either be a `directory` (in which can it can only be served through http if it has an `index.html` file at its root) or a `file` (in which case its metadata is used to serve it over http).

Smart contracts provide a generic `get_inode_at(cid, paths[])` view which can resolve an inode from its full path in a single call.

## Examples

```
onchfs://6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840
```

Point file object at `6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840` , where the context in which the URI was found defines the blockchain/network (for instance if a smart contract references this address, the resources will be found on the main file object smart contract of the ethereum mainnet)

---

```
onchfs://6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840/folder/index.html
```

Point inode folder at `6db0...6840` , in its `folder` directory, in which `index.html` is the target. Context is defined by where URI is found.

---

```
onchfs://ethereum:5/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840
```

Point file object at `6db0...6840` on the `ethereum` blockchain, goerli (`:5`) chain

---

```
onchfs://68b75b4e8439a7099e53045bea850b3266e95906.eth/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840
```

Point file object `6db0...6840` on the contract `68b75b4e8439a7099e53045bea850b3266e95906` of the ethereum mainnet

## ABNF

The ABNF specification for onchfs URIs, as defined in [RFC 5234](https://datatracker.ietf.org/doc/html/rfc5234)

```abnf
URI                   = "onchfs://" [ authority "/" ] cid [ "/" path ]
                        [ "?" query ] [ "#" fragment ]

; while the authority is blockchain-specific as different
; blockchains will have different strategies to identify
; its resources with URI, this provides a generic pattern
; for the authority as reference:

generic-authority     = [ contract-address "." ] blockchain-name
                        [ ":" chainid ]

; this defines how the authority is constructed for the
; ethereum and tezos blockchains, currently supported

authority             = authority-tez / authority-eth

authority-tez         = [ tez-contract-addr "." ]
                        ( "tezos" / "tez" / "xtz" )
                        [ ":" ( "mainnet" / "ghostnet" ) ]

authority-eth         = [ eth-contract-addr "." ]
                        ( "ethereum" / "eth" )
                        [ ":" eth-chainid ]

eth-chainid           = 1*DIGIT
                          ; ex: 1=mainnet, 5=goerli, 6=arbitrum

; a cid is always 64 hex characters (32 bytes), and no authority
; construction can collide with it. that's how it gets
; differenciated from it by parsers
cid                   = 64hex

; path aligned on RFC 1738 section 5
path                  = segment *[ "/" segment ]
segment               = *[ uchar / low-reserved ]

query                 = *[ uchar / low-reserved / "/" / "?" ]

fragment              = *[ uchar / low-reserved / "/" / "?" ]

; blockchain-specific utilities
tez-contract-addr     = "KT" ("1" / "2" / "3" / "4") 33( b58 )
eth-contract-addr     = 40hex

; base58 check encoding characters
b58                   = "1" / "2" / "3" / "4" / "5" / "6" / "7" /
                        "8" / "9" / "A" / "B" / "C" / "D" / "E" /
                        "F" / "G" / "H" / "J" / "K" / "L" / "M" /
                        "N" / "P" / "Q" / "R" / "S" / "T" / "U" /
                        "V" / "W" / "X" / "Y" / "Z" / "a" / "b" /
                        "c" / "d" / "e" / "f" / "g" / "h" / "i" /
                        "j" / "k" / "m" / "n" / "o" / "p" / "q" /
                        "r" / "s" / "t" / "u" / "v" / "w" / "x" /
                        "y" / "z"

hex                   = DIGIT / "A" / "B" / "C" / "D" / "E" / "F"
                              / "a" / "b" / "c" / "d" / "e" / "f"

pct-encoded           = "%" hex hex

safe                  = "$" / "-" / "_" / "." / "+"

extra                 = "!" / "*" / "'" / "(" / ")" / "," / "~"

low-reserved          = ";" / ":" / "@" / "&" / "="

reserved              = low-reserved / "/" / "?" / "#"

unreserved            = ALPHA / DIGIT / safe / extra

uchar                 = unreserved / pct-encoded

```
