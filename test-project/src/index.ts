import {
  prepareDirectory,
  prepareFile,
  generateInscriptions,
  Inscription,
} from "onchfs"
import fs from "fs"
import path from "path"
import dir from "node-dir"
import { TezosToolkit, ContractAbstraction } from "@taquito/taquito"
import { InMemorySigner } from "@taquito/signer"

// test with any folder/file at the root of the tests folder
const files = fs.readdirSync("./tests")

const tezos = new TezosToolkit("https://ghostnet.ecadinfra.com")
tezos.setProvider({
  signer: new InMemorySigner(
    "edskSA3GU5AdocLoJtsE2cvrxPAGPZc8RouYhCDaJJ95amCVipeUHiQXiDM37RnKZXed4bobudR8QHmA3cxHNgYDpS5ZcH5XJA"
  ),
})
const KT_STORE = "KT1TGsvdj2m3JA3RmMGekRYHnK7Ygkje7Xbt"
const KT_FILES = "KT1UMRhsB8ZvUD59BHyRuQSUbS4RUdSyJAzF"

const kts: Record<string, ContractAbstraction<any>> = {}
const KT = async (add: string) => {
  if (!kts[add]) {
    kts[add] = await tezos.contract.at(add)
  }
  return kts[add]
}

async function writeInscription(ins: Inscription) {
  console.log(`Inscription of ${ins.type}`)
  console.log(ins)
  if (ins.type === "chunk") {
    const kt = await KT(KT_STORE)
    const op = kt.methods.default(ins.content.toString("hex"))
    const res = await op.send()
    await res.confirmation(2)
  }
  if (ins.type === "file") {
    const kt = await KT(KT_FILES)
    const op = await kt.methodsObject
      .create_file({
        chunk_pointers: ins.chunks.map(buf => buf.toString("hex")),
        metadata: ins.metadata.map(buf => buf.toString("hex")),
      })
      .send()
    await op.confirmation(1)
  }
  if (ins.type === "directory") {
    const kt = await KT(KT_FILES)
    const formatted = Object.fromEntries(
      Object.entries(ins.files).map(([_, buf]) => [_, buf.toString("hex")])
    )
    const op = await kt.methodsObject.create_directory(formatted).send()
    await op.confirmation(1)
  }
  console.log("OK")
}

async function main() {
  for (const f of files) {
    // to avoid some files if we want
    if (f.startsWith("_")) continue

    console.log(
      "---------------------------------------------------------------"
    )

    const root = path.join("./tests", f)

    if (!fs.lstatSync(root).isDirectory()) {
      const content = fs.readFileSync(path.join("tests", f))
      const inode = await prepareFile(f, content, 10)
      console.log(inode)
      const inscrs = generateInscriptions(inode)
    }
    // is durectory
    else {
      dir.files(root, async (err, files) => {
        if (err) throw err
        // for each file, get the content
        const inode = await prepareDirectory(
          files.map(pt => {
            const pts = pt.split("/").slice(2).join("/")
            return {
              path: pts,
              content: fs.readFileSync(pt),
            }
          }),
          2048
        )
        const inscrs = generateInscriptions(inode)
        console.log(inscrs)
        for (const ins of inscrs) {
          await writeInscription(ins)
        }
      })
    }
  }
}
main()
