import { FileMetadataEntries } from "./metadata"
import { URIAuthority } from "./uri"

export interface InodeFileNativeFS {
  cid: string
  metadata: string | Uint8Array
  chunkPointers: string[]
}

export interface InodeDirectoryNativeFS {
  cid: string
  files: Record<string, string>
}

export type InodeNativeFS = InodeFileNativeFS | InodeDirectoryNativeFS

export interface Resolver {
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

export interface ProxyExtraHeaders {
  Location: string
}

export type ProxyHttpHeaders = FileMetadataEntries | ProxyExtraHeaders

export interface ProxyResolutionResponse {
  status: ProxyResolutionStatus
  content: Uint8Array
  headers: ProxyHttpHeaders
  error?: ProxyResolutionError
}
