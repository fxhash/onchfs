# Content-Store

A Content-Store provides low-level interfaces for storing, addressing and reading arbitrary chunks of data on-chain. As an illustration, a Content-Store is similar to a hard drive: it provides read/write low level features yet does not care about what the data represents.

A Content-Store provides 2 low-level utility functions:

- `write(bytes chunk) -> bytes32`: write arbitraty data to the store
- `read(bytes32 pointer) -> bytes`: read data at a given address

## Writing data

Let’s imagine one wants to write the following content:

```
80 76 05 fb 1d 7f 57 e3 14 71 8a 28 af 5a 80 ea
f6 04 b1 81 4d aa 2a 48 92 51 03 bd 33 23 60 47
96 5d 11 0d c4 22 56 19 af d8 14 c7 51 0a 60 b2
57 2a 72 aa 98 e8 e5 3d 30 05 80 3a 0d f4 5f 28
ae 16 75 84 cf 28 aa 11 4e 3d a6 e3 5e 30 9e ce
7d e0 f4 d6 f6 de 38 43 63 83 2d 9a c4 a9 aa 60
6f 00 89 f2 01 c4 81 0a 89 85 d0 d2 d2 5f c4 06
8f c6 26 e2 a0 c8 40 d8 3e 23 c2 06 02 11 67 c2
32 38 eb 92 54 1b 87 3d ba ef 97 5c 34 39 6d 4c
```

They will call `write(0x807605fb1d...)`, which will hash these bytes using keccak256, producing a 32 bytes unique signature (ex `1ed06317e8b25582933a1146b5629e8b89306df355283c95d78b9d109913ee60`) associated with the content. The content is then stored in a lookup table:

| pointer      | content     |
| ------------ | ----------- |
| 1ed06...ee60 | 807605fb... |
| cedf6...7674 | 34e705eb... |
| ...          | ...         |

## Reading data

Content pointers (hashes) must be known to retrieve the content. Using a known pointer (for instance the one generated at the previous step), one can call `read(0x1ed06317...)`, which will return the data written at the previous step.

That's it for the Content-Store, in essence it's a very simply low level storage mechanism, on which the **actual filesystem** can be built.

## Smart Contract specifications

```solidity
interface ONCHFS_ContentStore {
  /// @notice Writes an arbitraty chunk of data to the Store, addressed by a
  ///  keccak hash of such data
  /// @dev New chunks of data MUST be addressed by the keccak hash of their
  ///  data. Content already stored SHOULD NOT result in any calls to the store.
  /// @param _data Arbitraty bytes to store
  /// @return The pointer (keccak hash of the data) for retrieving the data
  function write(bytes _data) external payable returns (bytes32);

  /// @notice Returns some chunk of data at the given address
  /// @dev MUST throw if doesn't point to any entry in the store. This ensures
  ///  any contract relying on data stored in the content store to exist will
  ///  throw if such data is missing.
  /// @param _pointer Hash-pointer to the data
  /// @return The data of the chunk
  function read(bytes32 _pointer) external view returns (bytes);
}
```

:::info Solidity but not only!
While the interfaces are written in Solidity, ONCHFS is meant to be blockchain-agnostic. As such, equivalent interfaces should be used for blockchains supporting different languages.
:::
