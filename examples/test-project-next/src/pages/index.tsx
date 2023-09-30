import { TezosToolkit, ContractAbstraction } from "@taquito/taquito"
import { InMemorySigner } from "@taquito/signer"
import Onchfs, { Inscription } from "onchfs"

const files = [
  {
    name: "index文.html",
    content: `
<!DOCTYPE html>
<html>
  <head>
    <title>Ethereal Microcosm - ciphrd</title>
    <meta charset="utf-8">
    <script id="fxhash-snippet">
      let alphabet = "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ"
      var fxhash = new URLSearchParams(window.location.search).get('fxhash')
      let b58dec = str=>[...str].reduce((p,c)=>p*alphabet.length+alphabet.indexOf(c)|0, 0)
      let fxhashTrunc = fxhash.slice(2)
      let regex = new RegExp(".{" + ((fxhashTrunc.length/4)|0) + "}", 'g')
      let hashes = fxhashTrunc.match(regex).map(h => b58dec(h))
      let sfc32 = (a, b, c, d) => {
        return () => {
          a |= 0; b |= 0; c |= 0; d |= 0
          var t = (a + b | 0) + d | 0
          d = d + 1 | 0
          a = b ^ b >>> 9
          b = c + (c << 3) | 0
          c = c << 21 | c >>> 11
          c = c + t | 0
          return (t >>> 0) / 4294967296
        }
      }
      var fxrand = sfc32(...hashes)
      // used to get features during token mint
      window.addEventListener("message", (event) => {
        if (event.data === "fxhash_getFeatures") {
          parent.postMessage({
            id: "fxhash_getFeatures",
            data: window.$fxhashFeatures
          }, "*")
        }
      })
      var isFxpreview = new URLSearchParams(window.location.search).get('preview') === "1"
      function fxpreview() {
        window.dispatchEvent(new Event("fxhash-preview"))
        setTimeout(() => fxpreview(), 500)
      }
    </script>
    <link rel="stylesheet" href="./style.css">
  </head>
  <body>
    <canvas></canvas>
    <script type="text/javascript" src="./main.js"></script>
  </body>
</html>`,
  },
]

export default function Home() {
  const run = async () => {
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

    function uint8hex(uint8: Uint8Array): string {
      return [...uint8].map(x => x.toString(16).padStart(2, "0")).join("")
    }

    async function writeInscription(ins: Inscription) {
      console.log(`Inscription of ${ins.type}`)
      console.log(ins)
      if (ins.type === "chunk") {
        const kt = await KT(KT_STORE)
        const op = kt.methods.default(uint8hex(ins.content))
        const res = await op.send()
        await res.confirmation(2)
      }
      if (ins.type === "file") {
        const kt = await KT(KT_FILES)
        const op = await kt.methodsObject
          .create_file({
            chunk_pointers: ins.chunks.map(buf => uint8hex(buf)),
            metadata: ins.metadata.map(buf => uint8hex(buf)),
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

    const enc = new TextEncoder()
    const inode = await Onchfs.prepareDirectory(
      files.map(pt => {
        return {
          path: pt.name,
          content: enc.encode(pt.content),
        }
      }),
      2048
    )
    const inscrs = Onchfs.generateInscriptions(inode)
    console.log(inscrs)
    for (const ins of inscrs) {
      await writeInscription(ins)
    }
  }

  if (typeof window !== "undefined") {
    run()
  }

  return (
    <>
      <p>Look at the console</p>
    </>
  )
}
