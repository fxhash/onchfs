import {
  URIComponents,
  URIContext,
  parseURI,
  parseSchema,
  URISchemaSpecificComponent,
  parseSchemaSpecificPart,
  parseAuthority,
  URIAuthority,
  defaultContractsMap,
} from "./uri"

describe("parse URI", () => {
  it("should throw if invalid URI scheme", () => {
    expect(() => parseURI("https://example/com")).toThrow()
    expect(() => parseURI("ipfs://QmSomething")).toThrow()
    expect(() => parseURI("./some/relative/path.txt")).toThrow()
    expect(() =>
      parseURI(
        "abonchfs://ethereum:5/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840"
      )
    ).toThrow()
    expect(() =>
      parseURI(
        "onchfs://ethereum:5/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840°de"
      )
    ).toThrow()
  })

  it("should produce valid results from a known set", () => {
    const set: { uri: string; context?: URIContext; output: URIComponents }[] =
      [
        {
          uri: "onchfs://6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          context: {
            blockchainName: "ethereum",
          },
          output: {
            cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
            authority: {
              contract: "b0e58801d1b4d69179b7bc23fe54a37cee999b09",
              blockchainName: "ethereum",
              blockchainId: "1",
            },
          },
        },
        {
          uri: "onchfs://6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840/folder/index.html",
          context: {
            blockchainName: "ethereum",
          },
          output: {
            cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
            authority: {
              contract: "b0e58801d1b4d69179b7bc23fe54a37cee999b09",
              blockchainName: "ethereum",
              blockchainId: "1",
            },
            path: "/folder/index.html",
          },
        },
        {
          uri: "onchfs://ethereum:5/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          output: {
            cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
            authority: {
              contract: "fcfdfa971803e1cc201f80d8e74de71fddea6551",
              blockchainName: "ethereum",
              blockchainId: "5",
            },
          },
        },
        {
          uri: "onchfs://68b75b4e8439a7099e53045bea850b3266e95906.eth/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          output: {
            cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
            authority: {
              contract: "68b75b4e8439a7099e53045bea850b3266e95906",
              blockchainName: "ethereum",
              blockchainId: "1",
            },
          },
        },
        {
          uri: "onchfs://KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC.tezos/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          output: {
            cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
            authority: {
              contract: "KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC",
              blockchainName: "tezos",
              blockchainId: "mainnet",
            },
          },
        },
        {
          uri: "onchfs://6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840/folder/index.html?param1=4&param2=heyheyhey#a-fragment",
          context: {
            blockchainName: "ethereum",
          },
          output: {
            cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
            authority: {
              contract: "b0e58801d1b4d69179b7bc23fe54a37cee999b09",
              blockchainName: "ethereum",
              blockchainId: "1",
            },
            path: "/folder/index.html",
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
              blockchainId: "mainnet",
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
        "onchfs://ethereum:5/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840"
      )
    ).toEqual(
      parseURI(
        "onchfs://ethereum:5/6db0ff44176C6f1E9f471DC0c3f15194827D1129af94628a3a753c747f726840"
      )
    )
  })
})

describe("1st order URI parse", () => {
  it("should capture 2 groups for valid URIs", () => {
    expect(
      parseSchema(
        "onchfs://ethereum:5/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840"
      )
    ).toEqual(
      "ethereum:5/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840"
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
    const set: { uri: string; output: URISchemaSpecificComponent }[] = [
      {
        uri: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840/folder/index.html?param1=4&param2=heyheyhey#a-fragment",
        output: {
          cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          path: "/folder/index.html",
          query: "param1=4&param2=heyheyhey",
          fragment: "a-fragment",
        },
      },
      {
        uri: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840/folder/index.html?#a-fragment",
        output: {
          cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          path: "/folder/index.html",
          query: "",
          fragment: "a-fragment",
        },
      },
      {
        uri: "ethereum:5/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
        output: {
          cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          authority: "ethereum:5",
        },
      },
      {
        uri: "68b75b4e8439a7099e53045bea850b3266e95906.eth/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
        output: {
          cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          authority: "68b75b4e8439a7099e53045bea850b3266e95906.eth",
        },
      },
      {
        uri: "KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC.tezos/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
        output: {
          cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          authority: "KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC.tezos",
        },
      },
      {
        uri: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840/folder/index.html?param1=4&param2=h%20%A3%a3eyheyhey#a-fragment",
        output: {
          cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          path: "/folder/index.html",
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
    const set: { uri: string; output: URISchemaSpecificComponent }[] = [
      {
        uri: "aaaaaaaaaaaaaaaaaa:5/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
        output: {
          cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          authority: "aaaaaaaaaaaaaaaaaa:5",
        },
      },
      {
        uri: "68b75b4e8439a7099e53045bea850b3266e959.eth/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
        output: {
          cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          authority: "68b75b4e8439a7099e53045bea850b3266e959.eth",
        },
      },
      {
        uri: "KT1Wvz.tezos/6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
        output: {
          cid: "6db0ff44176c6f1e9f471dc0c3f15194827d1129af94628a3a753c747f726840",
          authority: "KT1Wvz.tezos",
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
        authority: "ethereum:5",
        out: {
          blockchainName: "ethereum",
          blockchainId: "5",
          contract: defaultContractsMap["ethereum:5"],
        },
      },
      {
        authority: "eth:5",
        out: {
          blockchainName: "ethereum",
          blockchainId: "5",
          contract: defaultContractsMap["ethereum:5"],
        },
      },
      {
        authority: "eth",
        out: {
          blockchainName: "ethereum",
          blockchainId: "1",
          contract: defaultContractsMap["ethereum:1"],
        },
      },
      {
        authority: "eth:1",
        out: {
          blockchainName: "ethereum",
          blockchainId: "1",
          contract: defaultContractsMap["ethereum:1"],
        },
      },
      {
        authority: "ethereum",
        out: {
          blockchainName: "ethereum",
          blockchainId: "1",
          contract: defaultContractsMap["ethereum:1"],
        },
      },
      {
        authority: "tezos:ghostnet",
        out: {
          blockchainName: "tezos",
          blockchainId: "ghostnet",
          contract: defaultContractsMap["tezos:ghostnet"],
        },
      },
      {
        authority: "tez:ghostnet",
        out: {
          blockchainName: "tezos",
          blockchainId: "ghostnet",
          contract: defaultContractsMap["tezos:ghostnet"],
        },
      },
      {
        authority: "tez",
        out: {
          blockchainName: "tezos",
          blockchainId: "mainnet",
          contract: defaultContractsMap["tezos:mainnet"],
        },
      },
      {
        authority: "tez:mainnet",
        out: {
          blockchainName: "tezos",
          blockchainId: "mainnet",
          contract: defaultContractsMap["tezos:mainnet"],
        },
      },
      {
        authority: "tezos",
        out: {
          blockchainName: "tezos",
          blockchainId: "mainnet",
          contract: defaultContractsMap["tezos:mainnet"],
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
          blockchainName: "ethereum",
        },
        out: {
          blockchainName: "ethereum",
          blockchainId: "1",
          contract: defaultContractsMap["ethereum:1"],
        },
      },
      {
        context: {
          blockchainName: "ethereum",
          blockchainId: "1",
          contract: defaultContractsMap["ethereum:1"],
        },
        out: {
          blockchainName: "ethereum",
          blockchainId: "1",
          contract: defaultContractsMap["ethereum:1"],
        },
      },
      {
        context: {
          blockchainName: "ethereum",
          blockchainId: "1",
          contract: defaultContractsMap["ethereum:1"],
        },
        out: {
          blockchainName: "ethereum",
          blockchainId: "1",
          contract: defaultContractsMap["ethereum:1"],
        },
      },
      {
        context: {
          blockchainName: "ethereum",
          blockchainId: "1",
          contract: "abcde",
        },
        out: {
          blockchainName: "ethereum",
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
          blockchainId: "mainnet",
          contract: defaultContractsMap["tezos:mainnet"],
        },
      },
    ]

    for (const entry of goods) {
      expect(parseAuthority(undefined, entry.context)).toEqual(entry.out)
    }
  })

  it("should fail if some segments are invalid", () => {
    expect(() => parseAuthority("KT8LELE.tezos")).toThrow()
    expect(() =>
      parseAuthority("1e9f471dc0c3f15194827d1129af94628a3a753K.eth")
    ).toThrow()
    expect(() =>
      parseAuthority("1e9f471dc0c3f15194827d1129af94628a3a753f.eth.ge")
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
