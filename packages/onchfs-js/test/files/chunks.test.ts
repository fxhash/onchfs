import { chunkBytes } from "../../src/files/chunks"
import { keccak } from "../../src/utils"

const u8 = (...arr: number[]) => new Uint8Array(arr)

describe("chunking some bytes", () => {
  test("empty buffer doesn't return any chunk", () => {
    expect(chunkBytes(u8())).toHaveLength(0)
  })

  test("chunking 2 bytes with chunkskize=1 produces 2 chunks of 1 byte", () => {
    expect(chunkBytes(u8(0, 1), 1)).toEqual([
      {
        bytes: u8(0),
        hash: keccak(u8(0)),
      },
      {
        bytes: u8(1),
        hash: keccak(u8(1)),
      },
    ])
  })

  test("chunking into unequals chunks leaves smaller last chunk", () => {
    expect(chunkBytes(u8(0, 1, 2), 2)).toEqual([
      {
        bytes: u8(0, 1),
        hash: keccak(u8(0, 1)),
      },
      {
        bytes: u8(2),
        hash: keccak(u8(2)),
      },
    ])
  })

  test("chunk size of 0 should throw", () => {
    expect(() => chunkBytes(u8(0), 0)).toThrow()
  })
})
