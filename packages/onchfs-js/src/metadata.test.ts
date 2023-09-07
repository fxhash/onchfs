import {
  validateMetadataValue,
  FORBIDDEN_METADATA_CHARS,
  encodeFileMetadata,
} from "./metadata"

const hex = (str: string) => new Uint8Array(Buffer.from(str, "hex"))

describe("validate metadata value", () => {
  test("1-255 ascii chars allowed", () => {
    const set = String.fromCharCode(
      ...new Array(255).fill(0).map((_, i) => i + 1)
    )
    expect(() => validateMetadataValue(set)).not.toThrow()
  })

  test("forbidden characters throw an error", () => {
    for (const c of FORBIDDEN_METADATA_CHARS) {
      const str = String.fromCharCode(45, 34, 56, c, 45)
      expect(() => validateMetadataValue(str)).toThrow()
    }
  })
})

describe("file metadata encoding", () => {
  test("empty file metadata doesn't yield any byte", () => {
    expect(encodeFileMetadata({})).toEqual([])
  })

  test("unknown metadata field is ignored", () => {
    expect(
      encodeFileMetadata({
        Unknown: "Random-Value",
      } as any)
    ).toEqual([])
  })

  test("different metadata fields are properly prefixed", () => {
    expect(encodeFileMetadata({ "Content-Type": "" })).toEqual([hex("0001")])
    expect(encodeFileMetadata({ "Content-Encoding": "" } as any)).toEqual([
      hex("0002"),
    ])
  })

  test("fields are encoded in the id-code asc order", () => {
    expect(
      encodeFileMetadata({ "Content-Type": "", "Content-Encoding": "" } as any)
    ).toEqual([hex("0001"), hex("0002")])
    expect(
      encodeFileMetadata({ "Content-Encoding": "", "Content-Type": "" } as any)
    ).toEqual([hex("0001"), hex("0002")])
  })

  test("encodes properly known results", () => {
    const known = [
      {
        metadata: {
          "Content-Type": "application/json",
        },
        encoded: ["00016170706c69636174696f6e2f6a736f6e"],
      },
      {
        metadata: {
          "Content-Type": "application/javascript",
        },
        encoded: ["00016170706c69636174696f6e2f6a617661736372697074"],
      },
      {
        metadata: { "Content-Type": "application/octet-stream" },
        encoded: ["00016170706c69636174696f6e2f6f637465742d73747265616d"],
      },
      {
        metadata: {
          "Content-Type": "application/javascript",
          "Content-Encoding": "gzip",
        },
        encoded: [
          "00016170706c69636174696f6e2f6a617661736372697074",
          "0002677a6970",
        ],
      },
      {
        metadata: { "Content-Encoding": "compress" },
        encoded: ["0002636f6d7072657373"],
      },
      { metadata: { "Content-Encoding": "gzip" }, encoded: ["0002677a6970"] },
    ]
    for (const entry of known) {
      expect(encodeFileMetadata(entry.metadata as any)).toEqual(
        entry.encoded.map(h => hex(h))
      )
    }
  })
})
