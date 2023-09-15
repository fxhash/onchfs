import {
  validateMetadataValue,
  FORBIDDEN_METADATA_CHARS,
  encodeFileMetadata,
  FileMetadataEntries,
  decodeFileMetadata,
} from "../../src/files/metadata"

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
    expect(encodeFileMetadata({})).toEqual(hex(""))
  })

  test("unknown metadata field is not ignored", () => {
    expect(
      encodeFileMetadata({
        "unknown-value": "Random-Value",
      } as any)
    ).not.toEqual(hex(""))
  })

  test("case is ignored for metadata fields", () => {
    expect(
      encodeFileMetadata({
        "content-type": "0",
        "content-encoding": "gzip",
      })
    ).toEqual(
      encodeFileMetadata({
        "Content-Type": "0",
        "Content-Encoding": "gzip",
      } as any)
    )
    expect(
      encodeFileMetadata({
        "coNtent-tYpe": "0",
        "conTEnt-encODing": "gzip",
      } as any)
    ).toEqual(
      encodeFileMetadata({
        "CONTent-Type": "0",
        "Content-EncOding": "gzip",
      } as any)
    )
  })

  test("encoding > decoding", () => {
    const entries: FileMetadataEntries[] = [
      {
        "content-type": "application/html",
        "content-encoding": "gzip",
      },
      {
        "content-type": "application/javascript",
      },
      {
        "content-encoding": "deflate",
      },
    ]

    for (const entry of entries) {
      expect(decodeFileMetadata(encodeFileMetadata(entry))).toEqual(entry)
    }
  })

  test("fields are encoded in their hpack static table order", () => {
    expect(
      Object.keys(
        encodeFileMetadata({
          "content-type": "any",
          "content-encoding": "gzip",
        })
      )
    ).toEqual(
      Object.keys(
        encodeFileMetadata({
          "content-encoding": "gzip",
          "content-type": "any",
        })
      )
    )
  })

  test("encodes properly known results", () => {
    const known = [
      {
        metadata: { "content-type": "application/json" },
        encoded: "5f8b1d75d0620d263d4c7441ea",
      },
      {
        metadata: { "content-type": "application/javascript" },
        encoded: "5f901d75d0620d263d4c741f71a0961ab4ff",
      },
      {
        metadata: { "content-type": "application/octet-stream" },
        encoded: "5f901d75d0620d263d4c1c892a56426c28e9",
      },
      {
        metadata: {
          "content-type": "application/javascript",
          "content-encoding": "gzip",
        },
        encoded: "5f901d75d0620d263d4c741f71a0961ab4ff5a839bd9ab",
      },
      {
        metadata: { "content-encoding": "compress" },
        encoded: "5a8621e9aec2a11f",
      },
      { metadata: { "content-encoding": "gzip" }, encoded: "5a839bd9ab" },
    ]
    for (const entry of known) {
      expect(encodeFileMetadata(entry.metadata as any)).toEqual(
        hex(entry.encoded)
      )
    }
  })
})
