import Onchfs, { Inscription } from "onchfs"
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
const KT_FILES = "KT1FA8AGGcJha6S6MqfBUiibwTaYhK8u7s9Q"

const kts: Record<string, ContractAbstraction<any>> = {}
const KT = async (add: string) => {
  if (!kts[add]) {
    kts[add] = await tezos.contract.at(add)
  }
  return kts[add]
}

function uint8hex(uint8: Uint8Array): string {
  return [...uint8].map(x => x.toString(16).padStart(2, "0")).join("")
}

async function writeInscription(ins: Inscription) {
  console.log(`Inscription of ${ins.type}`)
  console.log(ins)
  if (ins.type === "chunk") {
    const kt = await KT(KT_FILES)
    const op = await kt.methods.write_chunk(uint8hex(ins.content)).send()
    await op.confirmation(1)
  }
  if (ins.type === "file") {
    const kt = await KT(KT_FILES)
    const op = await kt.methodsObject
      .create_file({
        chunk_pointers: ins.chunks.map(buf => uint8hex(buf)),
        metadata: uint8hex(ins.metadata),
      })
      .send()
    await op.confirmation(1)
  }
  if (ins.type === "directory") {
    const kt = await KT(KT_FILES)
    const formatted = Object.fromEntries(
      Object.entries(ins.files).map(([_, buf]) => [_, uint8hex(buf)])
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
      const inode = Onchfs.files.prepare(
        {
          path: f,
          content: content,
        },
        {
          chunkSize: 10,
        }
      )
      console.log(inode)
      const inscrs = Onchfs.inscriptions.prepare(inode)
    }
    // is durectory
    else {
      dir.files(root, async (err, files) => {
        if (err) throw err
        // for each file, get the content
        const inode = await Onchfs.files.prepare(
          files.map(pt => {
            const pts = pt.split("/").slice(2).join("/")
            return {
              path: pts,
              content: fs.readFileSync(pt),
            }
          }),
          {
            chunkSize: 2048,
          }
        )
        const inscrs = Onchfs.inscriptions.prepare(inode)
        console.log(inscrs)
        for (const ins of inscrs) {
          await writeInscription(ins)
        }
      })
    }
  }
}
main()
