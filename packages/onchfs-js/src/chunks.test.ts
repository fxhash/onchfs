import keccak from "keccak"
import { chunkBytes } from "./chunks"

const xB = (str: string) => Buffer.from(str, "hex")

console.log(chunkBytes(xB("0000")))

describe("chunking somes bytes", () => {
  test("empty buffer doesn't return any chunk", () => {
    expect(chunkBytes(Buffer.alloc(0))).toHaveLength(0)
  })

  // test("chunking 2 bytes with chunkskize=1 produces 2 chunks of 1 byte", () => {
  //   expect(chunkBytes(xB("0000"))).toEqual([
  //     {
  //       bytes: xB("00"),
  //       // hash: keccak_0,
  //     },
  //     {
  //       bytes: xB("00"),
  //       // hash: keccak_0,
  //     },
  //   ])
  // })
})
