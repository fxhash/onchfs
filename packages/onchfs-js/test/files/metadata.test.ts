import { FileMetadataEntries } from "./../../src/types/metadata"
import { decodeMetadata } from "../../src/metadata/decode"
import { encodeMetadata } from "../../src/metadata/encode"
import {
  validateMetadataValue,
  FORBIDDEN_METADATA_CHARS,
} from "../../src/metadata/validation"

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
    expect(encodeMetadata({})).toEqual(hex(""))
  })

  test("unknown metadata field is not ignored", () => {
    expect(
      encodeMetadata({
        "unknown-value": "Random-Value",
      } as any)
    ).not.toEqual(hex(""))
  })

  test("case is ignored for metadata fields", () => {
    expect(
      encodeMetadata({
        "content-type": "0",
        "content-encoding": "gzip",
      })
    ).toEqual(
      encodeMetadata({
        "Content-Type": "0",
        "Content-Encoding": "gzip",
      } as any)
    )
    expect(
      encodeMetadata({
        "coNtent-tYpe": "0",
        "conTEnt-encODing": "gzip",
      } as any)
    ).toEqual(
      encodeMetadata({
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
      expect(decodeMetadata(encodeMetadata(entry))).toEqual(entry)
    }
  })

  test("fields are encoded in their hpack static table order", () => {
    expect(
      Object.keys(
        encodeMetadata({
          "content-type": "any",
          "content-encoding": "gzip",
        })
      )
    ).toEqual(
      Object.keys(
        encodeMetadata({
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
      expect(encodeMetadata(entry.metadata as any)).toEqual(hex(entry.encoded))
    }
  })
})
