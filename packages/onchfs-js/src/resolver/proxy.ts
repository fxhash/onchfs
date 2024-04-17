import { hexStringToBytes } from "@/utils"
import { OnchfsProxyResolutionError } from "./errors"
import { decodeMetadata } from "@/metadata/decode"
import {
  BlockchainResolver,
  BlockchainResolverCtrl,
  InodeDirectoryNativeFS,
  InodeFileNativeFS,
  InodeNativeFS,
  ProxyHttpHeaders,
  ProxyResolutionError,
  ProxyResolutionResponse,
  ProxyResolutionStatus,
  ProxyResolutionStatusErrors,
  ProxyResolutionStatusRedirect,
  ProxyResolutionStatusSuccess,
  Resolver,
  chainAliases,
} from "@/types/resolver"
import {
  BlockchainNetwork,
  URIAuthority,
  URISchemaSpecificParts,
  blockchainNetworks,
} from "@/types/uri"
import {
  parseAuthority,
  parseSchema,
  parseSchemaSpecificPart,
} from "@/uri/parse"
import { DEFAULT_CONTRACTS } from "@/config"
import {
  createPublicClient,
  encodeFunctionData,
  fallback,
  hexToBytes,
  http,
} from "viem"
import { ONCHFS_FILE_SYSTEM_ABI } from "@/utils/abi"
import { EthInode, EthInodeType } from "@/types/eth"
import { TezosService } from "@/services/tezos.service"

const ResolutionErrors: Record<ProxyResolutionStatusErrors, string> = {
  [ProxyResolutionStatusErrors.BAD_REQUEST]: "Bad Request",
  [ProxyResolutionStatusErrors.NOT_ACCEPTABLE]: "Resource Cannot be Served",
  [ProxyResolutionStatusErrors.NOT_FOUND]: "Not Found",
  [ProxyResolutionStatusErrors.INTERNAL_SERVER_ERROR]: "Internal Server Error",
}

function shuffle<T>(array: T[]): T[] {
  const out = [...array]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Creates a basic proxy resolver using a declarative list of blockchain
 * resolvers (network, RPC addresses, etc...). This function is a wrapper
 * over the lower level `proxy.createRaw()` function. It provides a basic
 * implementation of ONCHFS resolution using the declarative inputs which
 * provide endpoints for the fetch operations.
 *
 * @example
 *
 * ```ts
 * import onchfs from "onchfs"
 * import express from "express"
 *
 * const app = express()
 *
 * // setup resolver
 * const resolver = onchfs.resolver.create([
 *   {
 *     blockchain: "tezos:mainnet",
 *     rpcs: ["https://rpc1.fxhash.xyz", ...],
 *   },
 *   // ... more if desired
 * ])
 *
 * app.use(async (req, res, next) => {
 *   // resolve a URI
 *   const response = await resolver.resolve(req.path)
 *   // response can be used as is for http
 *   return res
 *     .header(response.headers)
 *     .status(response.status)
 *     .send(Buffer.from(response.content))
 * })
 *
 * app.listen(4000)
 * ```
 *
 * @param controllers A list of declarative objects specifying some data
 * required for the resolution of resources on various blockchains (RPCs,
 * optionnally contract addresses)
 *
 * @returns A resolver which can be called on an URI to get data from ONCHFS
 */
export function createProxyResolver(controllers: BlockchainResolverCtrl[]) {
  // add default cain contract if missing
  const blockchainResolvers: BlockchainResolver[] = controllers.map(h => {
    // find the base chain id by resolving aliases if needed
    let baseChainId: BlockchainNetwork
    if ((blockchainNetworks as readonly string[]).includes(h.blockchain)) {
      baseChainId = h.blockchain as BlockchainNetwork
    } else {
      for (const [base, aliases] of Object.entries(chainAliases)) {
        if ((aliases as readonly string[]).includes(h.blockchain)) {
          baseChainId = base as BlockchainNetwork
        }
      }
      if (!baseChainId) {
        throw new Error(
          `The given blockchain identifier "${h.blockchain}" is unknown, it cannot be resvoled by this resolver`
        )
      }
    }

    const blockchain = baseChainId.split(":")[0] as "tezos" | "eip155"

    switch (blockchain) {
      case "tezos": {
        const tezos = new TezosService(h.rpcs)

        return {
          blockchain: h.blockchain,
          resolverWithContract: (address?: string) => {
            // default blockchain address if not specified
            address = address || DEFAULT_CONTRACTS[baseChainId]
            if (!address) {
              throw new Error(
                `no contract address was found; neither can it be inferred from the context (${h.blockchain}) nor has it been provided during resolution.`
              )
            }
            return {
              getInodeAtPath: async (cid, path) => {
                const out = await tezos.call(address, kt =>
                  kt.contractViews
                    .get_inode_at({
                      cid,
                      path,
                    })
                    .executeView({
                      viewCaller: address,
                    })
                )

                // if the contract has answered with a directory
                if (out.inode.directory) {
                  const files: Record<string, string> = {}
                  for (const [name, pointer] of out.inode.directory.entries()) {
                    files[name] = pointer
                  }
                  return {
                    cid: out.cid,
                    files,
                  }
                } else {
                  // the contract has answered with a file
                  return {
                    cid: out.cid,
                    chunkPointers: out.inode.file.chunk_pointers,
                    metadata: out.inode.file.metadata,
                  }
                }
              },
              readFile: async cid => {
                const res = await tezos.call(address, kt =>
                  kt.contractViews.read_file(cid).executeView({
                    viewCaller: address,
                  })
                )
                return hexStringToBytes(res.content)
              },
            }
          },
        }
      }
      case "eip155": {
        const publicClient = createPublicClient({
          transport: fallback(h.rpcs.map(rpc => http(rpc))),
        })
        return {
          blockchain: h.blockchain,
          resolverWithContract: (address?: string) => {
            // default blockchain address if not specified
            address = address || DEFAULT_CONTRACTS[baseChainId]
            if (!address) {
              throw new Error(
                `no contract address was found; neither can it be inferred from the context (${h.blockchain}) nor has it been provided during resolution.`
              )
            }

            return {
              getInodeAtPath: async (cid: string, path: string[]) => {
                try {
                  //@ts-ignore
                  const out: [`0x${string}`, EthInode] = await (
                    publicClient as any
                  ).readContract({
                    address: address as `0x${string}`,
                    abi: ONCHFS_FILE_SYSTEM_ABI,
                    functionName: "getInodeAt",
                    args: [`0x${cid}`, path],
                  })
                  if (out && (out as any)?.length === 2) {
                    const cid = out[0].replace("0x", "")
                    const inode = out[1]

                    // if the contract has answered with a directory
                    if (inode.inodeType === EthInodeType.DIRECTORY) {
                      const dir = inode.directory
                      const files: Record<string, string> = {}
                      for (let i = 0; i < dir.filenames.length; i++) {
                        files[dir.filenames[i]] = dir.fileChecksums[i].replace(
                          "0x",
                          ""
                        )
                      }
                      return {
                        cid,
                        files,
                      }
                    } else {
                      const file = inode.file
                      // the contract has answered with a file
                      return {
                        cid,
                        chunkPointers: file.chunkChecksums.map(pt =>
                          pt.replace("0x", "")
                        ),
                        metadata: file.metadata.replace("0x", ""),
                      }
                    }
                  } else {
                    throw new Error("wrogn response from contract")
                  }
                } catch (err) {
                  return null
                }
              },
              readFile: async (cid: string) => {
                //@ts-ignore
                const hexBytesString = await publicClient.readContract({
                  address: address as `0x${string}`,
                  abi: ONCHFS_FILE_SYSTEM_ABI,
                  functionName: "readFile",
                  args: [`0x${cid}`],
                })
                return hexToBytes(hexBytesString as any)
              },
            }
          },
        }
      }
    }
  })

  /**
   * Given an authority (parsed into its components), returns an ordered list
   * of resolvers, based on the likelyhood the resource can be resolved given
   * its authority.
   * @param authority Authority components, parsed
   * @returns Ordered list of resolvers
   */
  function orderedResolversFromAuthority(authority?: URIAuthority) {
    let oBlockchainResolvers = blockchainResolvers
    if (authority) {
      // find the best resolver for the given authority
      const blockchain = `${authority.blockchainName}:${authority.blockchainId}`
      // try to find the resolver for (blockchain; contract), otherwise look
      // for the (blockchain) resolver
      const best = oBlockchainResolvers.find(R => blockchain === R.blockchain)
      if (best) {
        const bestIdx = oBlockchainResolvers.indexOf(best)
        oBlockchainResolvers = [...oBlockchainResolvers]
        const cut = oBlockchainResolvers.splice(0, bestIdx)
        oBlockchainResolvers.concat(cut)
      }
    }
    return oBlockchainResolvers
  }

  return createRawProxyResolver({
    async getInodeAtPath(cid, path, authority) {
      const resolvers = orderedResolversFromAuthority(authority)
      // try finding the resource on every resolver
      let res: InodeNativeFS | null = null
      try {
        res = await Promise.any(
          resolvers.map(async resolver => {
            const resp = await resolver
              .resolverWithContract(authority?.contract)
              .getInodeAtPath(cid, path)
            if (resp) return resp
            throw Error("file not found")
          })
        )
        if (res) return res
        throw null
      } catch (err) {
        console.log(err)
        throw new Error(
          "searched all available blockchains, resource not found."
        )
      }
    },
    async readFile(cid, chunkPointers, authority) {
      const resolvers = orderedResolversFromAuthority(authority)
      // try finding the resource on every resolver
      let res: string | Uint8Array | null = null
      try {
        res = await Promise.any(
          resolvers.map(async resolver => {
            const resp = await resolver
              .resolverWithContract(authority?.contract)
              .readFile(cid, chunkPointers)
            if (resp) return resp
            throw Error("file not found")
          })
        )
        if (res) return res
        throw null
      } catch (err) {
        console.log(err)
        throw new Error(
          "searched all available blockchains, resource not found."
        )
      }
    },
  })
}

/**
 * Creates a generic-purpose URI resolver, leaving the implementation of
 * the file system resource resolution to the consumer of this API. The
 * resolver is a function of URI, which executes a series of file system
 * operations based on the URI content and the responses from the file
 * system.
 *
 * @param resolver An object which implements low-level retrieval methods to
 * fetch the necessary content from the file system in order to resolve the
 * URI.
 * @returns A function which takes an URI as an input and executes a serie of
 * operations to retrieve the file targetted by the URI. The resolution
 * of the file pointers against the file system is left to the consuming
 * application, which can implement different strategies based on the
 * use-cases.
 */
export function createRawProxyResolver(resolver: Resolver) {
  /**
   * A function which takes an URI as an input and executes a serie of
   * operations to retrieve the file targetted by the URI. The resolution
   * of the file pointers against the file system is left to the consuming
   * application, which can implement different strategies based on the
   * use-cases.
   * @param uri An URI (schema-prefixed or not) pointing to the asset.
   */
  return async (uri: string): Promise<ProxyResolutionResponse> => {
    try {
      if (uri.startsWith("/")) {
        uri = uri.slice(1)
      }
      // extract the main components of interest: path & cid
      let components: URISchemaSpecificParts
      try {
        // if for some reason an absolute URI was provided at the proxy-
        // resolution level, extract it from the URI which will get parsed
        if (uri.startsWith("onchfs://")) {
          uri = parseSchema(uri)
        }
        // only the schema-specific part is parsed
        components = parseSchemaSpecificPart(uri)
      } catch (err) {
        throw new OnchfsProxyResolutionError(
          `The onchfs URI is invalid: ${err.message}`,
          ProxyResolutionStatusErrors.BAD_REQUEST
        )
      }

      let { cid, path, authority } = components
      // path segments are separated in array, empty segments are filtered out
      let paths = path?.split("/") || []
      paths = paths.filter(pt => pt.length > 0)

      // if there's an authority, parse it
      let parsedAuthority: URIAuthority | undefined
      if (authority) {
        parsedAuthority = parseAuthority(authority)
      }

      // resolve the inode at the given target
      let inode: InodeNativeFS
      let mainInode: InodeNativeFS
      try {
        inode = mainInode = await resolver.getInodeAtPath(
          cid,
          paths,
          parsedAuthority
        )
        if (!inode) {
          throw new OnchfsProxyResolutionError(
            `Could not find any inode at (${cid}, ${path})`,
            ProxyResolutionStatusErrors.NOT_FOUND
          )
        }
      } catch (err) {
        // if the error is already an instance of ProxyResolutionError, simply
        // forward it, otherwise craft a 500 error and throw it
        if (err instanceof OnchfsProxyResolutionError) {
          throw err
        } else {
          throw new OnchfsProxyResolutionError(
            err.message,
            ProxyResolutionStatusErrors.INTERNAL_SERVER_ERROR
          )
        }
      }

      // if the inode is a directory, try to get the index.html file
      if ((inode as InodeDirectoryNativeFS).files) {
        if ((inode as InodeDirectoryNativeFS).files["index.html"]) {
          try {
            inode = await resolver.getInodeAtPath(
              inode.cid,
              ["index.html"],
              parsedAuthority
            )
          } catch (err) {
            // throw an internal server error
            throw new OnchfsProxyResolutionError(
              `An error occurred when resolving the index.html file inside the target directory at /${
                inode.cid
              }${err.message ? `: ${err.message}` : ""}`,
              ProxyResolutionStatusErrors.INTERNAL_SERVER_ERROR
            )
          }
        }
        // if it's a directory but no index.html file at its root, throw
        else {
          throw new OnchfsProxyResolutionError(
            `the inode at (${cid}, ${path}) is a directory which doesn't contain any index.html file, as such it cannot be served.`,
            ProxyResolutionStatusErrors.NOT_ACCEPTABLE
          )
        }
      }

      // if the inode at this stage is a directory, throw
      if ((inode as InodeDirectoryNativeFS).files || !inode) {
        throw new OnchfsProxyResolutionError(
          `could not find a file inode at (${cid}, ${path})`,
          ProxyResolutionStatusErrors.NOT_FOUND
        )
      }

      // fetch the file content (eventually normalize data to Uint8Array)
      let content: Uint8Array
      try {
        const contentInput = await resolver.readFile(
          inode.cid,
          (inode as InodeFileNativeFS).chunkPointers,
          parsedAuthority
        )
        content =
          typeof contentInput === "string"
            ? hexStringToBytes(contentInput)
            : contentInput
      } catch (err) {
        throw new OnchfsProxyResolutionError(
          `An error occurred when reading the content of the file of cid ${
            inode.cid
          }${err.message ? `: ${err.message}` : ""}`,
          ProxyResolutionStatusErrors.INTERNAL_SERVER_ERROR
        )
      }

      // parse the metadata from the file into an object header ready for an
      // http response
      let headers: ProxyHttpHeaders
      const rawMetadataInput = (inode as InodeFileNativeFS).metadata
      try {
        const rawMetadata =
          typeof rawMetadataInput === "string"
            ? hexStringToBytes(rawMetadataInput)
            : rawMetadataInput
        headers = decodeMetadata(rawMetadata)
      } catch (err) {
        throw new OnchfsProxyResolutionError(
          `An error occurred when parsing the metadata of the file of cid ${
            inode.cid
          }, raw metadata bytes (${rawMetadataInput})${
            err.message ? `: ${err.message}` : ""
          }`,
          ProxyResolutionStatusErrors.INTERNAL_SERVER_ERROR
        )
      }

      let status: ProxyResolutionStatus = ProxyResolutionStatusSuccess.OK

      // if the main inode is a directory, & the given path doesn't end with a
      // trailing slash, we enforce a trailing slash at the end of the path to
      // ensure that browsers relative URL resolution will resolve files
      // relative to the one served starting at the end of the path.
      //
      // ex: /aeaeaeaeaeae   -> points to /aeaeaeaeaeae/index.html
      // ->  /aeaeaeaeaeae/  -> redirect to
      const wholeReqPath =
        components.cid + (components.path ? `/${components.path}` : "")
      if (
        (mainInode as InodeDirectoryNativeFS).files &&
        !wholeReqPath.endsWith("/") &&
        // in case a CID is followed by a "/" and an empty path, the "/" will
        // disappear during parsing due to the URI specification, however an
        // empty string path will appear, which is the only case where it
        // appears; as such we can test it to cover this edge-case.
        !(components.path === "")
      ) {
        const redirect =
          "/" +
          components.cid +
          (components.path ? `/${components.path}` : "") +
          "/" +
          (components.query ? `?${components.query}` : "")
        // add the Location header for redirect
        headers = {
          // preserve the existing headers; we will still be serving the content
          ...headers,
          Location: redirect,
        }
        status = ProxyResolutionStatusRedirect.PERMANENT
      }

      // everything is OK, the response can be served
      return {
        content,
        headers,
        status,
      }
    } catch (err) {
      // an error was found; it's very likely that it's a ProxyResolutionError
      // instance yet we procide a catch-all to ensure a 500 is returned if
      // the errors happens to be something else, unexpected
      let status: ProxyResolutionStatusErrors, error: ProxyResolutionError
      if (err instanceof OnchfsProxyResolutionError) {
        status = err.status
        error = {
          code: err.status,
          name: ResolutionErrors[err.status],
          message: err.message,
        }
      } else {
        status = ProxyResolutionStatusErrors.INTERNAL_SERVER_ERROR
        error = {
          code: ProxyResolutionStatusErrors.INTERNAL_SERVER_ERROR,
          name: ResolutionErrors[
            ProxyResolutionStatusErrors.INTERNAL_SERVER_ERROR
          ],
        }
      }
      // forward the response
      return {
        status,
        // we produce a basic html error page for proxy implementations which
        // just want to forward the response
        content: new TextEncoder().encode(
          `<h1>${status} ${error.name}</h1>${
            error.message ? `<p>${err.message}</p>` : ""
          }`
        ),
        // same with headers
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
        error,
      }
    }
  }
}
