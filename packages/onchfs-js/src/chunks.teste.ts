import { chunkBytes } from "./chunks"
import { keccak } from "./utils"

const u8 = (...arr: number[]) => new Uint8Array(arr)

describe("chunking some bytes", () => {
  test("empty buffer doesn't return any chunk", () => {
    expect(chunkBytes(u8())).toHaveLength(0)
  })

  test("chunking 2 bytes with chunkskize=1 produces 2 chunks of 1 byte", () => {
    expect(chunkBytes(u8(0, 0), 1)).toEqual([
      {
        bytes: u8(0),
        hash: keccak(u8(0)),
      },
      {
        bytes: u8(0),
        hash: keccak(u8(0)),
      },
    ])
  })
})
