import { prepareFile } from "onchfs"
import fs from "fs"
import path from "path"

// test with any folder/file at the root of the tests folder
const files = fs.readdirSync("./tests")

async function main() {
  for (const f of files) {
    console.log(
      "---------------------------------------------------------------"
    )
    const content = fs.readFileSync(path.join("tests", f))
    console.log({ name: f, content })
    console.log("---------------")
    const inode = await prepareFile(f, content, 10)
    console.log(inode)
  }
}
main()
