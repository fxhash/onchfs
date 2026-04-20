import { buildDirectoryGraph } from "../../src/files/directory"

const ef = (path: string) => ({
  path,
  content: new Uint8Array([0]),
})

describe("graph a list of files", () => {
  // console.log(buildDirectoryGraph([]))

  test("empty file list returns a single empty root directory", () => {
    expect(buildDirectoryGraph([])).toEqual([
      { type: "directory", files: {}, parent: null },
      [],
    ])
  })

  test("any path ending by a / should throw", () => {
    expect(() => buildDirectoryGraph([ef("/")])).toThrow()
    expect(() => buildDirectoryGraph([ef("ferfef/freferf/frefer/")])).toThrow()
    expect(() => buildDirectoryGraph([ef("adede")])).not.toThrow()
    expect(() => buildDirectoryGraph([ef("adede"), ef("efef/")])).toThrow()
  })

  test("any path starting with a / should throw", () => {
    expect(() => buildDirectoryGraph([ef("/")])).toThrow()
    expect(() => buildDirectoryGraph([ef("/rfrfr")])).toThrow()
    expect(() => buildDirectoryGraph([ef("refreferf"), ef("/rfrfr")])).toThrow()
  })

  it("should be compatible with paths starting with ./", () => {
    expect(buildDirectoryGraph([ef("./hey")])).toEqual(
      buildDirectoryGraph([ef("hey")])
    )
  })
})
