import { prepareDirectory, prepareFile, generateInscriptions } from "onchfs"
import fs from "fs"
import path from "path"
import dir from "node-dir"

// test with any folder/file at the root of the tests folder
const files = fs.readdirSync("./tests")

async function main() {
  for (const f of files) {
    console.log(
      "---------------------------------------------------------------"
    )

    const root = path.join("./tests", f)
    console.log(root)

    if (!fs.lstatSync(root).isDirectory()) {
      const content = fs.readFileSync(path.join("tests", f))
      console.log({ name: f, content })
      console.log("---------------")
      const inode = await prepareFile(f, content, 10)
      console.log(inode)
      console.log(generateInscriptions(inode))
    }
    // is durectory
    else {
      dir.files(root, async (err, files) => {
        if (err) throw err
        const paths = files.map(f => {
          const pts = f.split("/")
          pts.shift()
          return path.join(...pts)
        })
        // for each file, get the content
        const inode = await prepareDirectory(
          paths.map(pt => ({
            path: pt,
            content: fs.readFileSync(path.join("./tests", pt)),
          }))
        )
        console.log(inode)
        console.log(generateInscriptions(inode))
      })
    }
  }
}
main()
