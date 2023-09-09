import { FileMetadataEntries, decodeFileMetadata } from "../metadata"
import {
  URIAuthority,
  URISchemaSpecificParts,
  parseAuthority,
  parseSchema,
  parseSchemaSpecificPart,
} from "../uri"
import { hexStringToBytes } from "../utils"
import { OnchfsProxyResolutionError } from "./errors"

interface InodeFileNativeFS {
  cid: string
  metadata: (string | Uint8Array)[]
  chunkPointers: string[]
}

interface InodeDirectoryNativeFS {
  cid: string
  files: Record<string, string>
}

export type InodeNativeFS = InodeFileNativeFS | InodeDirectoryNativeFS

interface Resolver {
  getInodeAtPath: (
    cid: string,
    path: string[],
    authority?: URIAuthority
  ) => Promise<InodeNativeFS | null>
  readFile: (
    cid: string,
    chunkPointers: string[],
    authority?: URIAuthority
  ) => Promise<string | Uint8Array>
}

export enum ProxyResolutionStatusErrors {
  NOT_ACCEPTABLE = 406,
  NOT_FOUND = 404,
  BAD_REQUEST = 400,
  INTERNAL_SERVER_ERROR = 500,
}

const ResolutionErrors: Record<ProxyResolutionStatusErrors, string> = {
  [ProxyResolutionStatusErrors.BAD_REQUEST]: "Bad Request",
  [ProxyResolutionStatusErrors.NOT_ACCEPTABLE]: "Resource Cannot be Served",
  [ProxyResolutionStatusErrors.NOT_FOUND]: "Not Found",
  [ProxyResolutionStatusErrors.INTERNAL_SERVER_ERROR]: "Internal Server Error",
}

export enum ProxyResolutionStatusSuccess {
  OK = 200,
}

export enum ProxyResolutionStatusRedirect {
  PERMANENT = 308,
}

export type ProxyResolutionStatus =
  | ProxyResolutionStatusSuccess
  | ProxyResolutionStatusErrors
  | ProxyResolutionStatusRedirect

export interface ProxyResolutionError {
  code: number
  name: string
  message?: string
}

interface ProxyExtraHeaders {
  Location: string
}

type ProxyHttpHeaders = FileMetadataEntries | ProxyExtraHeaders

export interface ProxyResolutionResponse {
  status: ProxyResolutionStatus
  content: Uint8Array
  headers: ProxyHttpHeaders
  error?: ProxyResolutionError
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
export function createOnchfsResolver(resolver: Resolver) {
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
        const rawMetadata = rawMetadataInput.map(met =>
          typeof met === "string" ? hexStringToBytes(met) : met
        )
        headers = decodeFileMetadata(rawMetadata)
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
          "Content-Type": "text/html; charset=utf-8",
        },
        error,
      }
    }
  }
}
