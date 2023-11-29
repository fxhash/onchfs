import axios from "axios"
import Onchfs, { Inscription } from "onchfs"
import fs from "node:fs"
import path from "node:path"
import dir from "node-dir"
import { TezosToolkit, ContractAbstraction } from "@taquito/taquito"
import { InMemorySigner } from "@taquito/signer"
import { bytesToHex, createPublicClient, createWalletClient, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { goerli } from "viem/chains"
import { config } from "@fxhash/config"
import { ONCHFS_FILE_SYSTEM_ABI, ONCHFS_CONTENT_STORE } from "@fxhash/eth-sdk"

async function sleep(time: number) {
  return new Promise(resolve => setTimeout(resolve, time))
}

var walk = function (dir, done) {
  var results = []
  fs.readdir(dir, function (err, list) {
    if (err) return done(err)
    var pending = list.length
    if (!pending) return done(null, results)
    list.forEach(function (file) {
      file = path.resolve(dir, file)
      fs.stat(file, function (err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function (err, res) {
            results = results.concat(res)
            if (!--pending) done(null, results)
          })
        } else {
          results.push(file)
          if (!--pending) done(null, results)
        }
      })
    })
  })
}

// test with any folder/file at the root of the tests folder
const files = fs.readdirSync("./tests")

const tezos = new TezosToolkit("https://ghostnet.ecadinfra.com")
tezos.setProvider({
  signer: new InMemorySigner(
    "edskSA3GU5AdocLoJtsE2cvrxPAGPZc8RouYhCDaJJ95amCVipeUHiQXiDM37RnKZXed4bobudR8QHmA3cxHNgYDpS5ZcH5XJA"
  ),
})
const KT_CHUNKS = "KT1TGsvdj2m3JA3RmMGekRYHnK7Ygkje7Xbt"
const KT_FILES = "KT1FA8AGGcJha6S6MqfBUiibwTaYhK8u7s9Q"
const TZKT = "https://api.ghostnet.tzkt.io/v1"

const kts: Record<string, ContractAbstraction<any>> = {}
const KT = async (add: string) => {
  if (!kts[add]) {
    kts[add] = await tezos.contract.at(add)
  }
  return kts[add]
}
const ethWalletClient = createWalletClient({
  chain: goerli,
  account: privateKeyToAccount(
    "0xc6ce7bd0af8af4d72dec91fd78c44e5579aac9907a4e22b5424bd903fbd521fd"
  ),
  transport: http(
    "https://eth-goerli.g.alchemy.com/v2/eGEGqTf0cBekTDv0Ghy1kXPKhdNSLmn7"
  ),
})

const ethPublicClient = createPublicClient({
  transport: http(
    "https://eth-goerli.g.alchemy.com/v2/eGEGqTf0cBekTDv0Ghy1kXPKhdNSLmn7"
  ),
  chain: goerli,
})

function uint8hex(uint8: Uint8Array): string {
  return [...uint8].map(x => x.toString(16).padStart(2, "0")).join("")
}

async function writeInscription(ins: Inscription) {
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

async function writeInscriptionEth(ins: Inscription) {
  if (ins.type === "chunk") {
    console.log("-------------------")
    console.log("writing chunk:")
    console.log(uint8hex(ins.content))
    //@ts-ignore
    const { request } = await ethPublicClient.simulateContract({
      account: ethWalletClient.account,
      address: config.eth.contracts!.onchfs_content_store,
      abi: ONCHFS_CONTENT_STORE,
      functionName: "addContent",
      args: [bytesToHex(ins.content)],
    })
    //@ts-ignore
    const transaction = await ethWalletClient.writeContract(request)
    console.log(transaction)
  } else if (ins.type === "file") {
    //@ts-ignore
    const { request } = await ethPublicClient.simulateContract({
      account: ethWalletClient.account,
      address: config.eth.contracts!.onchfs_file_system,
      abi: ONCHFS_FILE_SYSTEM_ABI,
      functionName: "createFile",
      args: [
        bytesToHex(ins.metadata),
        ins.chunks.map(chunk => bytesToHex(chunk)),
      ],
    })
    //@ts-ignore
    const hash = await ethWalletClient.writeContract(request)
    console.log(hash)
  } else {
    //@ts-ignore
    const { request } = await ethPublicClient.simulateContract({
      account: ethWalletClient.account,
      address: config.eth.contracts!.onchfs_file_system,
      abi: ONCHFS_FILE_SYSTEM_ABI,
      functionName: "createDirectory",
      args: Object.entries(ins.files).reduce(
        (acc, [name, content]) => [
          [...acc[0], name],
          [...acc[1], bytesToHex(content)],
        ],
        [[], []]
      ),
    })
    //@ts-ignore
    const hash = await ethWalletClient.writeContract(request)
    console.log(hash)
  }
}

async function main() {
  for (const f of files) {
    // to avoid some files if we want
    if (f.startsWith("_")) continue

    let inscrs

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
          fileHashingStrategy: "cheap",
        }
      )
      inscrs = Onchfs.inscriptions.prepare(inode)
    }
    // is durectory
    else {
      console.log("is dir !!")
      console.log(root)
      walk(root, (err, res) => {
        console.log("doooooooooone")
        console.log({ res })
      })
      console.log(files)
      dir.files(root, async (err, files) => {
        console.log("file found")
        if (err) throw err
        // for each file, get the content
        const inode = Onchfs.files.prepare(
          files.map(pt => {
            const pts = pt.split("/").slice(2).join("/")
            return {
              path: pts,
              content: fs.readFileSync(pt),
            }
          }),
          {
            chunkSize: 2048,
            fileHashingStrategy: "cheap",
          }
        )
        inscrs = Onchfs.inscriptions.prepare(inode)
        // const inscrs = await Onchfs.inscriptions.prepare(inode, {
        //   async inodeExists(cid) {
        //     const res = await axios.get(
        //       `${TZKT}/contracts/${KT_FILES}/bigmaps/inodes/keys/${cid}`
        //     )
        //     return res.status === 200
        //   },
        //   async chunkExists(cid) {
        //     const res = await axios.get(`${TZKT}/bigmaps/354463/keys/${cid}`)
        //     return res.status === 200
        //   },
        // })
      })
      console.log("end read")
    }
    console.log("inscruptions")
    console.log(inscrs)
    for (const ins of inscrs) {
      console.log("yooo")
      await writeInscriptionEth(ins)
    }
  }
}
main()
