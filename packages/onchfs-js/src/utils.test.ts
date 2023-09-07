import { compareUint8Arrays } from "./utils"

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
