import { compareUint8Arrays, hexStringToBytes } from "./utils"

const u8 = (...n: number[]) => new Uint8Array(n)

describe("sort Uint8 array properly", () => {
  test("1 element array", () => {
    expect(compareUint8Arrays(u8(0), u8(1))).toBeLessThan(0)
    expect(compareUint8Arrays(u8(1), u8(0))).toBeGreaterThan(0)
  })

  test("2 element arrays", () => {
    expect(compareUint8Arrays(u8(0, 1), u8(0, 2))).toBeLessThan(0)
    expect(compareUint8Arrays(u8(1, 0), u8(2, 0))).toBeLessThan(0)
    expect(compareUint8Arrays(u8(2, 0), u8(1, 0))).toBeGreaterThan(0)
  })

  test("can sort arrays properly", () => {
    expect([u8(0), u8(1), u8(2)].sort(compareUint8Arrays)).toEqual([
      u8(0),
      u8(1),
      u8(2),
    ])
    expect([u8(2), u8(1), u8(0)].sort(compareUint8Arrays)).toEqual([
      u8(0),
      u8(1),
      u8(2),
    ])
    expect(compareUint8Arrays(u8(0, 1, 2), u8(1, 0, 0))).toBeLessThan(0)
    expect([u8(0, 1, 2), u8(1, 0, 0)].sort(compareUint8Arrays)).toEqual([
      u8(0, 1, 2),
      u8(1, 0, 0),
    ])
  })
})

describe("hexStringToBytes", () => {
  it("should parse hex string into bytes", () => {
    expect(hexStringToBytes("0000")).toEqual(u8(0, 0))
    expect(hexStringToBytes("01")).toEqual(u8(1))
    expect(hexStringToBytes("0001")).toEqual(u8(0, 1))
    expect(hexStringToBytes("0001746578742f68746d6c")).toEqual(
      u8(0, 1, 116, 101, 120, 116, 47, 104, 116, 109, 108)
    )
  })

  it("should throw if a hex string is malformed", () => {
    expect(() => hexStringToBytes("0")).toThrow()
    expect(() => hexStringToBytes("000")).toThrow()
    expect(() => hexStringToBytes("P")).toThrow()
    expect(() => hexStringToBytes("1A1p")).toThrow()
  })
})
