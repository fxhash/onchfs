import express from "express"
import Onchfs, { ProxyResolutionResponse } from "onchfs"

/**
 * A very naïve in-memory cache, just demonstrates how cache can be implemented
 * programmatically (ideally one would use Redis or some Cloud provider native
 * solution).
 */
const inMemoryCache: Record<string, ProxyResolutionResponse> = {}
function cache(key: string, response: ProxyResolutionResponse) {
  if (inMemoryCache[key]) return
  inMemoryCache[key] = response
}

async function main() {
  // Create the resolver, it will be responsible for implementing 2 operations
  // executed during the resolution flow
  const resolve = Onchfs.resolver.create([
    {
      blockchain: "tezos:ghostnet",
      rpcs: ["https://ghostnet.ecadinfra.com"],
    },
    {
      blockchain: "tezos:mainnet",
      rpcs: [
        "https://mainnet.ecadinfra.com",
        "https://mainnet.smartpy.io",
        "https://rpc.tzbeta.net/",
        "https://mainnet.tezos.marigold.dev/",
        "https://eu01-node.teztools.net/",
      ],
    },
  ])

  // setup the express server
  const app = express()

  // (speed-up demo): this implements a cache retrieval based on the req.path,
  // which is rather trivial. As explained at the top of this file, in-memory
  // cache isn't ideal, although east to implement
  app.use(async (req, res, next) => {
    if (inMemoryCache[req.path]) {
      console.log(`⚡️ cache hit for ${req.path}`)
      const response = inMemoryCache[req.path]
      return res
        .header(response.headers)
        .status(response.status)
        .send(Buffer.from(response.content))
    } else {
      return next()
    }
  })

  // The resolution middleware, in this case it's using the resolver created
  // using Onchfs.resolver.create(), which will execute an internal flow
  // following the spec on how to retrieve a file on the onchfs. It will
  // call the implementation provided at its creation for resolving some
  // file system pointers against the network.
  app.use(async (req, res) => {
    const response = await resolve(req.path)

    // if it's a successful response, we cache it
    if (response.status === 200) {
      cache(req.path, response)
    }

    // forward the resolver response as designed to be served over HTTP.
    // provides built-in error messages
    return res
      .header(response.headers)
      .status(response.status)
      .send(Buffer.from(response.content))
  })

  app.listen(3000, () => {
    console.log("proxy running")
  })
}

main()
