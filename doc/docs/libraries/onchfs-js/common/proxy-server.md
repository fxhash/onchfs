# Proxy server to ONCHFS resources

_Express js is used here as an example but the resolver is framework-agnostic, as such any server implementation can be used._

```ts
import onchfs from "onchfs"
import express from "express"

const app = express()

// setup resolver
const resolver = onchfs.resolver.create([
  {
    blockchain: "tezos:mainnet",
    rpcs: ["https://rpc1.fxhash.xyz", "..."],
  },
  // ... more if desired
])

app.use(async (req, res, next) => {
  // resolve a URI
  const response = await resolver.resolve(req.path)
  // response can be used as is for http
  return res
    .header(response.headers)
    .status(response.status)
    .send(Buffer.from(response.content))
})

app.listen(4000)
```
