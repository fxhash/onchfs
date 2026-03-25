import {
  parseURI,
  parseSchema,
  parseSchemaSpecificPart,
  parseAuthority,
} from "../../src/uri/parse"
import {
  URIComponents,
  URIContext,
  URISchemaSpecificParts,
  URIAuthority,
} from "../../src/types/uri"
import { DEFAULT_CONTRACTS } from "../../src/config"

const TEZOS_MAIN_ID = "NetXdQprcVkpaWU"
const TEZOS_GHOST_ID = "NetXnHfVqm9iesp"

const CHARSETS = (() => {
  const LOW_ALPHA = "abcdefghijklmnopqrstuvwxyz"
  const HI_ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const ALPHA = LOW_ALPHA + HI_ALPHA
  const DIGIT = "0123456789"
  const SAFE = "$-_.+"
  const EXTRA = "!*'(),~"
  const LOW_RESERVED = ";:@&="
  const RESERVED = LOW_RESERVED + "/?#"
  const HEX = DIGIT + "ABCDEFabcdef"
  const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
  const UNRESERVED = ALPHA + DIGIT + SAFE + EXTRA
  const UCHAR = UNRESERVED //+ ESCAPE
  const XCHAR = UNRESERVED + RESERVED //+ ESCAPE

  let ESCAPE: string[] = []
  for (const c1 of HEX) {
    for (const c2 of HEX) {
      ESCAPE.push(`%${c1}${c2}`)
    }
  }

  const arr = (s: string) => s.split("")

  return {
    LOW_ALPHA: arr(LOW_ALPHA),
    HI_ALPHA: arr(HI_ALPHA),
    ALPHA: arr(ALPHA),
    DIGIT: arr(DIGIT),
    SAFE: arr(SAFE),
    EXTRA: arr(EXTRA),
    LOW_RESERVED: arr(LOW_RESERVED),
    RESERVED: arr(RESERVED),
    HEX: arr(HEX),
    B58: arr(B58),
    UNRESERVED: arr(UNRESERVED),
    UCHAR: arr(UCHAR).concat(ESCAPE),
    XCHAR: arr(XCHAR).concat(ESCAPE),
    ALL: new Array(256).fill(0).map((_, i) => String.fromCharCode(i)),
  }
})()

/**
 * We test a base URI to be valid, which will be used for testing other cases
 * such base is sane.
 */
const SANE =
  "onchfs://6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840"
describe("sanity check", () => {
  it("should pass sanity check", () => {
    expect(() => parseSchema(SANE)).not.toThrow()
    expect(() => parseURI(SANE, { blockchainName: "tezos" })).not.toThrow()
  })
})

/**
 * Testing characters allowed AND ONLY characters allowed are passing.
 */
describe("URI charset overview", () => {
  for (const C of CHARSETS.XCHAR) {
    test(`schem-specific part MUST allow "${C}"`, () => {
      expect(() => parseSchema(`${SANE}${C}`)).not.toThrow()
    })
  }

  // all the ASCII characters MINUS allowed set
  const FORBIDDEN_CHARS = CHARSETS.ALL.filter(C => !CHARSETS.XCHAR.includes(C))

  for (const C of FORBIDDEN_CHARS) {
    test(`character code ${C.charCodeAt(0)} is forbidden`, () => {
      expect(() => parseSchema(`${SANE}${C}`)).toThrow()
    })
  }
})

describe("cid MUST only be formed of hex characters", () => {
  const CID_MIN_1 =
    "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f72684"
  const SANE2 = `onchfs://${CID_MIN_1}`

  for (const C of CHARSETS.HEX) {
    it(`MUST allow "${C}"`, () => {
      expect(
        parseURI(SANE2 + C + "/path", { blockchainName: "tezos" })
      ).toHaveProperty("cid", (CID_MIN_1 + C).toLowerCase())
    })
  }

  // all the ASCII characters MINUS allowed set
  const FORBIDDEN_CHARS = CHARSETS.ALL.filter(C => !CHARSETS.HEX.includes(C))
  for (const C of FORBIDDEN_CHARS) {
    test(`character code ${C.charCodeAt(0)} is forbidden`, () => {
      expect(() =>
        parseURI(SANE2 + C + "/path", { blockchainName: "tezos" })
      ).toThrow()
    })
  }
})

describe("path segment MUST only accept certain characters", () => {
  const SEG_CHAR = CHARSETS.UCHAR.concat(";:@&=".split(""))
  for (const C of SEG_CHAR) {
    it(`MUST allow "${C}"`, () => {
      expect(
        parseURI(`${SANE}/${C}/${C}?q=a`, {
          blockchainName: "tezos",
        })
      ).toHaveProperty("path", `${C}/${C}`)
    })
  }

  // all the URI-allowed characters MINUS allowed set
  const FORBIDDEN_CHARS = CHARSETS.XCHAR.filter(C => !SEG_CHAR.includes(C))
  for (const C of FORBIDDEN_CHARS) {
    // the "/" character is avoided as it's allowed to delimit paths and will
    // be caught by the parser as part of the path, rightfully
    if (C === "/") continue
    test(`character ${C} is forbidden`, () => {
      expect(
        parseURI(`${SANE}/a${C}`, { blockchainName: "tezos" })
      ).toHaveProperty("path", "a")
    })
  }
})

describe("query segment MUST only accept certain characters", () => {
  const SEG_CHAR = CHARSETS.UCHAR.concat(CHARSETS.LOW_RESERVED).concat([
    "/",
    "?",
  ])
  for (const C of SEG_CHAR) {
    it(`MUST allow "${C}"`, () => {
      expect(
        parseURI(`${SANE}/badoom?${C}#delim`, {
          blockchainName: "tezos",
        })
      ).toHaveProperty("query", C)
    })
  }

  // all the URI-allowed characters MINUS allowed set
  const FORBIDDEN_CHARS = CHARSETS.XCHAR.filter(C => !SEG_CHAR.includes(C))
  for (const C of FORBIDDEN_CHARS) {
    test(`character "${C}" is forbidden`, () => {
      expect(() =>
        parseURI(`${SANE}/badoom?a${C}#delim`, { blockchainName: "tezos" })
      ).toThrow()
    })
  }
})

describe("fragment segment MUST only accept certain characters", () => {
  const SEG_CHAR = CHARSETS.UCHAR.concat(CHARSETS.LOW_RESERVED).concat([
    "/",
    "?",
  ])
  for (const C of SEG_CHAR) {
    it(`MUST allow "${C}"`, () => {
      expect(
        parseURI(`${SANE}/badoom#${C}`, {
          blockchainName: "tezos",
        })
      ).toHaveProperty("fragment", C)
    })
  }

  // all the URI-allowed characters MINUS allowed set
  const FORBIDDEN_CHARS = CHARSETS.XCHAR.filter(C => !SEG_CHAR.includes(C))
  for (const C of FORBIDDEN_CHARS) {
    test(`character "${C}" is forbidden`, () => {
      expect(() =>
        parseURI(`${SANE}/#${C}`, { blockchainName: "tezos" })
      ).toThrow()
    })
  }
})

describe("tezos pattern constrains", () => {
  const KT_BASE = (a: string, c: string) =>
    `KT${a}WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuu${c}`
  const BASE = (a: string, c: string) =>
    `tezos:${TEZOS_MAIN_ID}:${KT_BASE(a, c)}`

  test("sanity check with known valid address", () => {
    expect(parseAuthority(BASE("1", "a"))).toHaveProperty(
      "contract",
      KT_BASE("1", "a")
    )
  })

  const ALLOWED_IDS = "1234".split("")
  for (const C of ALLOWED_IDS) {
    it(`MUST accept valid digit following KT: "${C}"`, () => {
      expect(parseAuthority(BASE(C, "a"))).toHaveProperty(
        "contract",
        KT_BASE(C, "a")
      )
    })
  }
  const FORBID_IDS = CHARSETS.XCHAR.filter(C => !ALLOWED_IDS.includes(C))
  for (const C of FORBID_IDS) {
    it(`MUST reject "${C}" following KT`, () => {
      expect(() => parseAuthority(BASE(C, "a"))).toThrow()
    })
  }

  for (const C of CHARSETS.B58) {
    it(`MUST accept any base58 character: "${C}"`, () => {
      expect(parseAuthority(BASE("1", C))).toHaveProperty(
        "contract",
        KT_BASE("1", C)
      )
    })
  }
  const FORBID = CHARSETS.XCHAR.filter(C => !CHARSETS.B58.includes(C))
  for (const C of FORBID) {
    it(`MUST reject "${C}" as invalid B58 character`, () => {
      expect(() => parseAuthority(BASE("1", C))).toThrow()
    })
  }
})

describe("parse URI", () => {
  it("should throw if invalid URI scheme", () => {
    expect(() => parseURI("https://example/com")).toThrow()
    expect(() => parseURI("ipfs://QmSomething")).toThrow()
    expect(() => parseURI("./some/relative/path.txt")).toThrow()
    expect(() =>
      parseURI(
        "abonchfs://eip155:5/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840"
      )
    ).toThrow()
    expect(() =>
      parseURI(
        "onchfs://eip155:5/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840°de"
      )
    ).toThrow()
  })

  it("should produce valid results from a known set", () => {
    const set: { uri: string; context?: URIContext; output: URIComponents }[] =
      [
        {
          uri: "onchfs://6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          context: {
            blockchainName: "eip155",
          },
          output: {
            cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
            authority: {
              contract: "b0e58801d1b4d69179b7bc23fe54a37cee999b09",
              blockchainName: "eip155",
              blockchainId: "1",
            },
          },
        },
        {
          uri: "onchfs://6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840/folder/index.html",
          context: {
            blockchainName: "eip155",
          },
          output: {
            cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
            authority: {
              contract: "b0e58801d1b4d69179b7bc23fe54a37cee999b09",
              blockchainName: "eip155",
              blockchainId: "1",
            },
            path: "folder/index.html",
          },
        },
        {
          uri: "onchfs://eip155:5/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          output: {
            cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
            authority: {
              contract: "fcfdfa971803e1cc201f80d8e74de71fddea6551",
              blockchainName: "eip155",
              blockchainId: "5",
            },
          },
        },
        {
          uri: "onchfs://eip155:1:68b75b4e8439a7099e53045bea850b3266e95906/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          output: {
            cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
            authority: {
              contract: "68b75b4e8439a7099e53045bea850b3266e95906",
              blockchainName: "eip155",
              blockchainId: "1",
            },
          },
        },
        {
          uri: "onchfs://tezos:NetXdQprcVkpaWU:KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          output: {
            cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
            authority: {
              contract: "KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC",
              blockchainName: "tezos",
              blockchainId: "NetXdQprcVkpaWU",
            },
          },
        },
        {
          uri: "onchfs://6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840/folder/index.html?param1=4&param2=heyheyhey#a-fragment",
          context: {
            blockchainName: "eip155",
          },
          output: {
            cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
            authority: {
              contract: "b0e58801d1b4d69179b7bc23fe54a37cee999b09",
              blockchainName: "eip155",
              blockchainId: "1",
            },
            path: "folder/index.html",
            query: "param1=4&param2=heyheyhey",
            fragment: "a-fragment",
          },
        },
        {
          uri: "onchfs://6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840?a-param=1234",
          context: {
            blockchainName: "tezos",
          },
          output: {
            cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
            authority: {
              contract: "KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC",
              blockchainName: "tezos",
              blockchainId: "NetXdQprcVkpaWU",
            },
            query: "a-param=1234",
          },
        },
        // todo
        // ... add more
      ]

    for (const entry of set) {
      expect(parseURI(entry.uri, entry.context)).toEqual(entry.output)
    }
  })

  it("should throw if CID is malformed", () => {
    expect(() =>
      parseURI(
        "onchfs://6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f72684",
        {
          blockchainName: "tezos",
        }
      )
    ).toThrow()
    expect(() =>
      parseURI(
        "onchfs://6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f72684",
        {
          blockchainName: "tezos",
        }
      )
    ).toThrow()
  })

  it("should throw if contract address if malformed", () => {
    expect(() =>
      parseURI(
        "onchfs://KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuu.tezos/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840"
      )
    ).toThrow()
    expect(() =>
      parseURI(
        "onchfs://KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuO.tezos/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840"
      )
    ).toThrow()
    expect(() =>
      parseURI(
        "onchfs://68b75b4e8439a7099e53045bea850b3266e9590.eth/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840"
      )
    ).toThrow()
    expect(() =>
      parseURI(
        "onchfs://68b75b4e8439a7099e53045bea850b3266e9590Z.eth/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840"
      )
    ).toThrow()
  })

  it("should throw if it cannot infer target from URI only", () => {
    expect(() =>
      parseURI(
        "onchfs://6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840"
      )
    ).toThrow()
    expect(() =>
      parseURI(
        "onchfs://6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840/folder/index.html"
      )
    ).toThrow()
  })

  it("should normalize hexadecimal points (lower/upper)-case", () => {
    expect(
      parseURI(
        "onchfs://eip155/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840"
      )
    ).toEqual(
      parseURI(
        "onchfs://eip155/6db0ff44176C6f1E9f471DC0c3f15194827D1129af94628a3a753c747f726840"
      )
    )
  })
})

describe("parseSchema", () => {
  it("should capture 2 groups for valid URIs", () => {
    expect(
      parseSchema(
        "onchfs://eip155/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840"
      )
    ).toEqual(
      "eip155/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840"
    )
    expect(
      parseSchema(
        "onchfs://6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840"
      )
    ).toEqual(
      "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840"
    )
    expect(
      parseSchema(
        "onchfs://6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840/folder/index.html?param1=4&param2=heyheyhey#a-fragment"
      )
    ).toEqual(
      "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840/folder/index.html?param1=4&param2=heyheyhey#a-fragment"
    )
  })

  it("should throw when URI general format is invalid", () => {
    expect(() => parseSchema("onchfs://")).toThrow()
    expect(() =>
      parseSchema(
        "onchfs://6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840°"
      )
    ).toThrow()
    expect(() =>
      parseSchema(
        "onchfs://6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840°23"
      )
    ).toThrow()
    expect(() =>
      parseSchema(
        "Aonchfs://6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840"
      )
    ).toThrow()
    expect(() =>
      parseSchema(
        "onchfs:/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840"
      )
    ).toThrow()
    expect(() =>
      parseSchema(
        "onchfs:6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840"
      )
    ).toThrow()
    expect(() =>
      parseSchema(
        "/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840"
      )
    ).toThrow()
  })
})

describe("parse schema-specific components", () => {
  it("should output expected results among known outputs", () => {
    const set: { uri: string; output: URISchemaSpecificParts }[] = [
      {
        uri: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840/folder/index.html?param1=4&param2=heyheyhey#a-fragment",
        output: {
          cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          path: "folder/index.html",
          query: "param1=4&param2=heyheyhey",
          fragment: "a-fragment",
        },
      },
      {
        uri: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840/folder/index.html?#a-fragment",
        output: {
          cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          path: "folder/index.html",
          query: "",
          fragment: "a-fragment",
        },
      },
      {
        uri: "eip155:5/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
        output: {
          cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          authority: "eip155:5",
        },
      },
      {
        uri: "eip155:342-45e:68b75b4e8439a7099e53045bea850b3266e95906/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
        output: {
          cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          authority: "eip155:342-45e:68b75b4e8439a7099e53045bea850b3266e95906",
        },
      },
      {
        // weird chain id "bleblebleble"
        uri: "tezos:blebleble:KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
        output: {
          cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          authority: "tezos:blebleble:KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC",
        },
      },
      {
        uri: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840/folder/index.html?param1=4&param2=h%20%A3%a3eyheyhey#a-fragment",
        output: {
          cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          path: "folder/index.html",
          query: "param1=4&param2=h%20%A3%a3eyheyhey",
          fragment: "a-fragment",
        },
      },
    ]

    for (const entry of set) {
      expect(parseSchemaSpecificPart(entry.uri)).toEqual(entry.output)
    }
  })

  it("should still parse semi-invalid authority segment", () => {
    const set: { uri: string; output: URISchemaSpecificParts }[] = [
      {
        uri: "aaaaaaa:5/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
        output: {
          cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          authority: "aaaaaaa:5",
        },
      },
      {
        // eth address has 38 characters
        uri: "eip155:1:68b75b4e8439a7099e53045bea850b3266e959/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
        output: {
          cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          authority: "eip155:1:68b75b4e8439a7099e53045bea850b3266e959",
        },
      },
      {
        uri: "tezos:NetXdQprcVkpaWU:KT1Wvz/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
        output: {
          cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          authority: "tezos:NetXdQprcVkpaWU:KT1Wvz",
        },
      },
    ]

    for (const entry of set) {
      expect(parseSchemaSpecificPart(entry.uri)).toEqual(entry.output)
    }
  })

  it("shouldn't parse invalid/missing CIDs", () => {
    const wrong = [
      "/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f7268",
      "eth:5/index.html?test=1",
      "68b75b4e8439a7099e53045bea850b3266e959.eth/",
      "//6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
      "KT1Wvz.tezos//6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
      "KT1Wvz.tezos/a/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
    ]

    for (const entry of wrong) {
      expect(() => parseSchemaSpecificPart(entry)).toThrow()
    }
  })

  it("should parse valid percent-encoding", () => {
    const good = [
      // witness
      "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840/folder/index.html?param1=4&param2=heyheyhey#a-fragment",
      // verify
      "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840/folder/index.html?param1=4&param2=hey%20%AEheyhey#a-fragment",
    ]
    for (const entry of good) {
      expect(() => parseSchemaSpecificPart(entry)).not.toThrow()
    }
  })

  it("shouldn't parse invalid percent-encoding", () => {
    const wrong = [
      // %2  (missing a 2nd hex character)
      "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840/folder/index.html?param1=4&param2=hey%2&heyhey#a-fragment",
      // %%
      "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840/folder/index.html?param1=4&param2=hey%%heyhey#a-fragment",
      // %-encoding in the wrong section
      "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94%20628a3a753c747f726840/folder/index.html?param1=4&param2=hey%%heyhey#a-fragment",
      "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840/folder/index.html?param1=4&param2=hey%%heyhey#a-fragment%20",
    ]
    for (const entry of wrong) {
      expect(() => parseSchemaSpecificPart(entry)).toThrow()
    }
  })

  it("should support %-encoding in paths", () => {
    const good = [
      "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840/folder/ind%20ex.html?param1=4&param2=hey&heyhey#a-fragment",
    ]
    for (const entry of good) {
      expect(() => parseSchemaSpecificPart(entry)).not.toThrow()
    }
  })
})

describe("URI authority parser", () => {
  it("should fully infer components from authority segments well composed", () => {
    const good: {
      authority?: string
      context?: URIContext
      out: URIAuthority
    }[] = [
      {
        authority: "eip155:5",
        out: {
          blockchainName: "eip155",
          blockchainId: "5",
          contract: DEFAULT_CONTRACTS["eip155:5"],
        },
      },
      {
        authority: "eip155:5",
        out: {
          blockchainName: "eip155",
          blockchainId: "5",
          contract: DEFAULT_CONTRACTS["eip155:5"],
        },
      },
      {
        authority: "eip155",
        out: {
          blockchainName: "eip155",
          blockchainId: "1",
          contract: DEFAULT_CONTRACTS["eip155:1"],
        },
      },
      {
        authority: "tezos:NetXnHfVqm9iesp",
        out: {
          blockchainName: "tezos",
          blockchainId: "NetXnHfVqm9iesp",
          contract: DEFAULT_CONTRACTS["tezos:NetXnHfVqm9iesp"],
        },
      },
      {
        authority: "tezos",
        out: {
          blockchainName: "tezos",
          blockchainId: "NetXdQprcVkpaWU",
          contract: DEFAULT_CONTRACTS["tezos:NetXdQprcVkpaWU"],
        },
      },
    ]

    for (const entry of good) {
      expect(parseAuthority(entry.authority, entry.context)).toEqual(entry.out)
    }
  })

  it("should rely on context when authority segment is missing", () => {
    const goods: { context: URIContext; out: URIAuthority }[] = [
      {
        context: {
          blockchainName: "eip155",
        },
        out: {
          blockchainName: "eip155",
          blockchainId: "1",
          contract: DEFAULT_CONTRACTS["eip155:1"],
        },
      },
      {
        context: {
          blockchainName: "eip155",
          blockchainId: "1",
          contract: DEFAULT_CONTRACTS["eip155:1"],
        },
        out: {
          blockchainName: "eip155",
          blockchainId: "1",
          contract: DEFAULT_CONTRACTS["eip155:1"],
        },
      },
      {
        context: {
          blockchainName: "eip155",
          blockchainId: "1",
          contract: DEFAULT_CONTRACTS["eip155:1"],
        },
        out: {
          blockchainName: "eip155",
          blockchainId: "1",
          contract: DEFAULT_CONTRACTS["eip155:1"],
        },
      },
      {
        context: {
          blockchainName: "eip155",
          blockchainId: "1",
          contract: "abcde",
        },
        out: {
          blockchainName: "eip155",
          blockchainId: "1",
          contract: "abcde",
        },
      },
      {
        context: {
          blockchainName: "tezos",
        },
        out: {
          blockchainName: "tezos",
          blockchainId: "NetXdQprcVkpaWU",
          contract: DEFAULT_CONTRACTS["tezos:NetXdQprcVkpaWU"],
        },
      },
    ]

    for (const entry of goods) {
      expect(parseAuthority(undefined, entry.context)).toEqual(entry.out)
    }
  })

  it("should fail if some segments are invalid", () => {
    expect(() => parseAuthority("tezos:NetXdQprcVkpaWU:KT8LELE")).toThrow()
    expect(() =>
      parseAuthority("eip155:1:1e9f471dc0c3f15194827d1129af94628a3a753K")
    ).toThrow()
    expect(() =>
      parseAuthority("eip155:1:1e9f471dc0c3f15194827d1129af94628a3a753f.ge")
    ).toThrow()
    expect(() =>
      parseAuthority("eip155:1:1e9f471dc0c3f15194827d1129af94628a3a753f:1a")
    ).toThrow()
  })

  it("should throw when it cannot infer authority components", () => {
    /**
     * Matrix of Resolution cases
     *
     * Encoded as 3 bits for visual clarity:
     *  blockchain name / blockchain id / contract
     *
     *  ↓ context / auth ->    000  001  010  011  100  110  111  101
     *  000                     x    /    /    /    o    o    o    o
     *  001                     x    /    /    /    o    o    o    o
     *  010                     x    /    /    /    o    o    o    o
     *  011                     x    /    /    /    o    o    o    o
     *  100                     o    o    o    o    o    o    o    o
     *  110                     o    o    o    o    o    o    o    o
     *  111                     o    o    o    o    o    o    o    o
     *  101                     o    o    o    o    o    o    o    o
     *
     * x: cannot be resolved
     * /: is not possible (per authority grammar rules)
     * o: can be resolved
     **/
    // TODO
  })
})
