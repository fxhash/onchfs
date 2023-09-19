var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/files/index.ts
var files_exports = {};
__export(files_exports, {
  prepare: () => prepare,
  utils: () => utils
});

// src/config.ts
var INODE_BYTE_IDENTIFIER = {
  FILE: new Uint8Array([1]),
  DIRECTORY: new Uint8Array([0])
};
var DEFAULT_CHUNK_SIZE = 16384;
var DEFAULT_CONTRACTS = {
  "tezos:mainnet": "KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC",
  "tezos:ghostnet": "KT1XZ2FyRNtzYCBoy18Rp7R9oejvFSPqkBoy",
  "ethereum:1": "b0e58801d1b4d69179b7bc23fe54a37cee999b09",
  "ethereum:5": "fcfdfa971803e1cc201f80d8e74de71fddea6551"
};

// src/utils/index.ts
var utils_exports = {};
__export(utils_exports, {
  BytesCopiedFrom: () => BytesCopiedFrom,
  areUint8ArrayEqual: () => areUint8ArrayEqual,
  compareUint8Arrays: () => compareUint8Arrays,
  concatUint8Arrays: () => concatUint8Arrays,
  hexStringToBytes: () => hexStringToBytes,
  keccak: () => keccak
});

// src/utils/keccak.ts
import { keccak256 } from "js-sha3";
function keccak(bytes) {
  return new Uint8Array(keccak256.digest(bytes));
}

// src/utils/string.ts
function hexStringToBytes(hex) {
  const reg = new RegExp("^(?:[a-fA-F0-9]{2})*$");
  if (!reg.exec(hex)) {
    throw new Error(
      `Cannot decode an hexadecimal string because its pattern is invalid
Expected: ${reg.toString()}
Got ${hex.slice(
        0,
        80
      )}${hex.length > 80 ? "..." : ""}`
    );
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length / 2; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// src/utils/uint8.ts
function BytesCopiedFrom(source, offset = 0, length) {
  length = typeof length === "undefined" ? source.byteLength - offset : length;
  const out = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    out[i] = source[i + offset];
  }
  return out;
}
function concatUint8Arrays(...arrays) {
  const L = arrays.reduce((acc, arr) => arr.length + acc, 0);
  const out = new Uint8Array(L);
  let offset = 0;
  for (const arr of arrays) {
    out.set(arr, offset);
    offset += arr.length;
  }
  return out;
}
function compareUint8Arrays(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i])
      return -1;
    if (a[i] > b[i])
      return 1;
  }
  return 1;
}
function areUint8ArrayEqual(a, b) {
  if (a.length !== b.length)
    return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i])
      return false;
  }
  return true;
}

// src/files/chunks.ts
function chunkBytes(content, chunkSize = DEFAULT_CHUNK_SIZE) {
  if (chunkSize == 0) {
    throw new Error(`invalid chunk size, must be positive integer`);
  }
  const L = content.length;
  const nb = Math.ceil(L / chunkSize);
  const chunks = [];
  let chunk;
  for (let i = 0; i < nb; i++) {
    chunk = BytesCopiedFrom(
      content,
      i * chunkSize,
      Math.min(chunkSize, L - i * chunkSize)
    );
    chunks.push({
      bytes: chunk,
      hash: keccak(chunk)
    });
  }
  return chunks;
}

// src/files/file.ts
import { gzip } from "pako";
import { lookup as lookupMime } from "mime-types";

// src/metadata/encode.ts
import hpack2 from "hpack.js";

// src/metadata/validation.ts
var FORBIDDEN_METADATA_CHARS = [
  0
  // NUL character
];
function validateMetadataValue(value) {
  for (let i = 0; i < value.length; i++) {
    if (FORBIDDEN_METADATA_CHARS.includes(value.charCodeAt(i))) {
      throw new Error(
        `contains invalid character (code: ${value.charCodeAt(
          i
        )}) at position ${i}`
      );
    }
  }
}

// src/metadata/shared.ts
import hpack from "hpack.js";
function fieldHpackStaticTableIndex(name) {
  const elem = hpack["static-table"].table.find(
    (row) => row.name === name.toLowerCase()
  );
  if (!elem)
    return null;
  return hpack["static-table"].table.indexOf(elem);
}

// src/metadata/encode.ts
function encodeMetadata(metadata) {
  const comp = hpack2.compressor.create({ table: { size: 256 } });
  let headers = [];
  let name, value;
  for (const entry in metadata) {
    name = entry.toLowerCase();
    value = metadata[entry];
    try {
      validateMetadataValue(value);
    } catch (err) {
      throw new Error(
        `Error when validating the metadata field "${entry}": ${err.message}`
      );
    }
    headers.push({
      name,
      value
    });
  }
  headers = headers.sort((a, b) => {
    const iA = fieldHpackStaticTableIndex(a.name);
    const iB = fieldHpackStaticTableIndex(b.name);
    if (iA === null && iB !== null)
      return -1;
    if (iB === null && iA !== null)
      return 1;
    if (iA === null && iB === null)
      return 0;
    return iB - iA;
  });
  comp.write(headers);
  return new Uint8Array(comp.read());
}

// src/files/file.ts
async function prepareFile(file, chunkSize = DEFAULT_CHUNK_SIZE) {
  const { path: name, content } = file;
  let metadata = {};
  let insertionBytes = content;
  let mime = lookupMime(name);
  if (!mime) {
  } else {
    metadata["Content-Type"] = mime;
  }
  const compressed = gzip(content);
  if (compressed.byteLength < insertionBytes.byteLength) {
    insertionBytes = compressed;
    metadata["Content-Encoding"] = "gzip";
  }
  const chunks = chunkBytes(insertionBytes, chunkSize);
  const metadataEncoded = encodeMetadata(metadata);
  const contentHash = keccak(insertionBytes);
  const metadataHash = keccak(metadataEncoded);
  const cid = keccak(
    concatUint8Arrays(INODE_BYTE_IDENTIFIER.FILE, contentHash, metadataHash)
  );
  return {
    type: "file",
    cid,
    chunks,
    metadata: metadataEncoded
  };
}

// src/files/directory.ts
function encodeFilename(name) {
  return encodeURIComponent(name);
}
function computeDirectoryInode(dir) {
  const acc = [];
  const filenames = Object.keys(dir.files).sort();
  const dirFiles = {};
  for (const filename of filenames) {
    const inode = dir.files[filename].inode;
    dirFiles[filename] = inode;
    acc.unshift(keccak(filename));
    acc.unshift(inode.cid);
  }
  acc.unshift(INODE_BYTE_IDENTIFIER.DIRECTORY);
  return {
    type: "directory",
    cid: keccak(concatUint8Arrays(...acc)),
    files: dirFiles
  };
}
function buildDirectoryGraph(files) {
  let graph = {
    type: "directory",
    files: {},
    parent: null
  };
  const leaves = [];
  for (const file of files) {
    let active = graph, part = "";
    const formattedPath = file.path.startsWith("./") ? file.path.slice(2) : file.path;
    const parts = formattedPath.split("/").map((part2) => encodeFilename(part2));
    for (let i = 0; i < parts.length; i++) {
      part = parts[i];
      if (part.length === 0) {
        throw new Error(
          `The file ${file.path} contains an invalid part, there must be at least 1 character for each part.`
        );
      }
      if (i === parts.length - 1) {
        if (active.files.hasOwnProperty(part)) {
          throw new Error(
            `The file at path ${file.path} is colliding with another path in the directory. There mush be a single path pointing to a file.`
          );
        }
        const nLeave = {
          type: "file",
          content: file.content,
          name: part,
          parent: active
        };
        active.files[part] = nLeave;
        leaves.push(nLeave);
      } else {
        if (active.files.hasOwnProperty(part)) {
          active = active.files[part];
        } else {
          const nDir = {
            type: "directory",
            files: {},
            parent: active
          };
          active.files[part] = nDir;
          active = nDir;
        }
      }
    }
  }
  return [graph, leaves];
}
async function prepareDirectory(files, chunkSize = DEFAULT_CHUNK_SIZE) {
  const [graph, leaves] = buildDirectoryGraph(files);
  const parsed = [];
  let parsing = leaves;
  while (parsing.length > 0) {
    const nextParse = [];
    for (const node of parsing) {
      if (parsed.includes(node))
        continue;
      if (node.type === "file") {
        node.inode = await prepareFile(
          {
            path: node.name,
            content: node.content
          },
          chunkSize
        );
      } else if (node.type === "directory") {
        node.inode = computeDirectoryInode(node);
      }
      parsed.push(node);
      if (node.parent) {
        const children = Object.values(node.parent.files);
        if (!children.find((child) => !child.inode)) {
          nextParse.push(node.parent);
        }
      }
    }
    parsing = nextParse;
  }
  return graph.inode;
}

// src/files/prepare.ts
var defaultPrepareOptions = {
  chunkSize: DEFAULT_CHUNK_SIZE
};
function prepare(files, options) {
  const _options = {
    ...defaultPrepareOptions,
    ...options
  };
  if (Array.isArray(files)) {
    return prepareDirectory(files, _options.chunkSize);
  } else {
    return prepareFile(files, _options.chunkSize);
  }
}

// src/files/index.ts
var utils = {
  chunkBytes,
  buildDirectoryGraph,
  computeDirectoryInode,
  encodeFilename
};

// src/inscriptions/index.ts
var inscriptions_exports = {};
__export(inscriptions_exports, {
  inscriptionsBytesLength: () => inscriptionsBytesLength,
  prepare: () => prepareInscriptions
});

// src/inscriptions/estimate.ts
function inscriptionBytesLength(ins) {
  switch (ins.type) {
    case "chunk":
      return ins.content.byteLength + 32;
    case "directory":
      return Object.keys(ins.files).map((name) => name.length + 32).reduce((a, b) => a + b, 0) + 32;
    case "file":
      return 32 + // 32 bytes for pointer
      32 * ins.chunks.length + // 32 bytes per chunk
      ins.metadata.byteLength;
  }
}
function inscriptionsBytesLength(inscriptions) {
  return inscriptions.reduce((acc, ins) => inscriptionBytesLength(ins) + acc, 0);
}

// src/inscriptions/prepare.ts
function prepareInscriptions(root) {
  const inscriptions = [];
  const traverse = (node) => {
    if (node.type === "directory") {
      inscriptions.push({
        type: "directory",
        files: Object.fromEntries(
          Object.keys(node.files).map((name) => [name, node.files[name].cid])
        ),
        cid: node.cid
      });
      for (const name in node.files) {
        traverse(node.files[name]);
      }
    } else if (node.type === "file") {
      inscriptions.push({
        type: "file",
        chunks: node.chunks.map((chk) => chk.hash),
        metadata: node.metadata,
        cid: node.cid
      });
      for (const chunk of node.chunks) {
        inscriptions.push({
          type: "chunk",
          content: chunk.bytes
        });
      }
    }
  };
  traverse(root);
  return inscriptions.reverse();
}

// src/metadata/index.ts
var metadata_exports = {};
__export(metadata_exports, {
  decode: () => decodeMetadata,
  encode: () => encodeMetadata,
  utils: () => utils2
});

// src/metadata/decode.ts
import hpack3 from "hpack.js";
function decodeMetadata(raw) {
  const decomp = hpack3.decompressor.create({ table: { size: 256 } });
  const metadata = {};
  decomp.write(raw);
  decomp.execute();
  let buff;
  while (buff = decomp.read()) {
    metadata[buff.name] = buff.value;
  }
  return metadata;
}

// src/metadata/index.ts
var utils2 = {
  validateMetadataValue
};

// src/resolver/index.ts
var resolver_exports = {};
__export(resolver_exports, {
  OnchfsProxyResolutionError: () => OnchfsProxyResolutionError,
  createProxyResolver: () => createProxyResolver,
  parse: () => parseURI,
  utils: () => utils3
});

// src/resolver/errors.ts
var OnchfsProxyResolutionError = class extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
    this.name = "OnchfsProxyResolutionError";
  }
};

// src/types/resolver.ts
var ProxyResolutionStatusErrors = /* @__PURE__ */ ((ProxyResolutionStatusErrors2) => {
  ProxyResolutionStatusErrors2[ProxyResolutionStatusErrors2["NOT_ACCEPTABLE"] = 406] = "NOT_ACCEPTABLE";
  ProxyResolutionStatusErrors2[ProxyResolutionStatusErrors2["NOT_FOUND"] = 404] = "NOT_FOUND";
  ProxyResolutionStatusErrors2[ProxyResolutionStatusErrors2["BAD_REQUEST"] = 400] = "BAD_REQUEST";
  ProxyResolutionStatusErrors2[ProxyResolutionStatusErrors2["INTERNAL_SERVER_ERROR"] = 500] = "INTERNAL_SERVER_ERROR";
  return ProxyResolutionStatusErrors2;
})(ProxyResolutionStatusErrors || {});
var ProxyResolutionStatusSuccess = /* @__PURE__ */ ((ProxyResolutionStatusSuccess2) => {
  ProxyResolutionStatusSuccess2[ProxyResolutionStatusSuccess2["OK"] = 200] = "OK";
  return ProxyResolutionStatusSuccess2;
})(ProxyResolutionStatusSuccess || {});
var ProxyResolutionStatusRedirect = /* @__PURE__ */ ((ProxyResolutionStatusRedirect2) => {
  ProxyResolutionStatusRedirect2[ProxyResolutionStatusRedirect2["PERMANENT"] = 308] = "PERMANENT";
  return ProxyResolutionStatusRedirect2;
})(ProxyResolutionStatusRedirect || {});

// src/types/uri.ts
var blockchainNames = ["tezos", "ethereum"];

// src/uri/parse.ts
var LOW_ALPHA = "a-z";
var HI_ALPHA = "A-Z";
var ALPHA = LOW_ALPHA + HI_ALPHA;
var DIGIT = "0-9";
var SAFE = "$\\-_.+";
var EXTRA = "!*'(),~";
var HEX_CHARSET = "A-Fa-f0-9";
var LOW_RESERVED = ";:@&=";
var RESERVED = LOW_RESERVED + "\\/?#";
var UNRESERVED = ALPHA + DIGIT + SAFE + EXTRA;
var PCT_ENCODED = `%[${HEX_CHARSET}]{2}`;
var UCHAR = `(?:(?:[${UNRESERVED}])|(?:${PCT_ENCODED}))`;
var XCHAR = `(?:(?:[${UNRESERVED}${RESERVED}])|(?:${PCT_ENCODED}))`;
var URI_CHARSET = XCHAR;
var B58_CHARSET = "1-9A-HJ-NP-Za-km-z";
var AUTHORITY_CHARSET = `${HEX_CHARSET}${B58_CHARSET}.a-z:`;
var SEG_CHARSET = `(?:(?:${UCHAR})|[${LOW_RESERVED}])`;
var QUERY_CHARSET = `(?:${SEG_CHARSET}|\\/|\\?)`;
function parseURI(uri, context) {
  try {
    const schemaSpecificPart = parseSchema(uri);
    const schemaSegments = parseSchemaSpecificPart(schemaSpecificPart);
    const authority = parseAuthority(schemaSegments.authority, context);
    return {
      ...schemaSegments,
      cid: schemaSegments.cid.toLowerCase(),
      authority
    };
  } catch (err) {
    throw new Error(
      `Error when parsing the URI "${uri}" as a onchfs URI: ${err.message}`
    );
  }
}
function parseSchema(uri) {
  const regex = new RegExp(`^(onchfs)://(${URI_CHARSET}{64,})$`);
  const results = regex.exec(uri);
  if (!results) {
    throw new Error(
      `general onchfs URI format is invalid / Pattern didn't match: ${regex.toString()}`
    );
  }
  return results[2];
}
function parseSchemaSpecificPart(uriPart) {
  const authorityReg = `([${AUTHORITY_CHARSET}]*)\\/`;
  const cidReg = `[${HEX_CHARSET}]{64}`;
  const pathReg = `${SEG_CHARSET}*(?:\\/${SEG_CHARSET}*)*`;
  const queryReg = `\\?(${QUERY_CHARSET}*)`;
  const fragReg = `#(${QUERY_CHARSET}*)`;
  const regex = new RegExp(
    `^(?:${authorityReg})?(${cidReg})(?:\\/(${pathReg}))?(?:${queryReg})?(?:${fragReg})?$`
  );
  const res = regex.exec(uriPart);
  if (!res) {
    throw new Error(
      `the URI schema specific component seems to be invalid. "${uriPart}" should respect the following pattern: ${regex.toString()}`
    );
  }
  const [_, authority, cid, path, query, fragment] = res;
  return {
    authority,
    cid,
    path,
    query,
    fragment
  };
}
var blockchainAuthorityParsers = {
  tezos: () => new RegExp(
    `^(?:(KT(?:1|2|3|4)[${B58_CHARSET}]{33})\\.)?(tezos|tez|xtz)(?::(ghostnet|mainnet))?$`
  ),
  ethereum: () => new RegExp(`^(?:([${HEX_CHARSET}]{40})\\.)?(ethereum|eth)(?::([0-9]+))?$`)
};
var blockchainNameVariants = {
  tezos: ["tezos", "tez", "xtz"],
  ethereum: ["ethereum", "eth"]
};
var blockchainDefaultNetwork = {
  tezos: "mainnet",
  ethereum: "1"
};
function parseAuthority(authority, context) {
  let tmp = { ...context };
  if (authority) {
    let regex, res;
    for (const name of blockchainNames) {
      regex = blockchainAuthorityParsers[name]();
      res = regex.exec(authority);
      if (!res)
        continue;
      const [contract, blockchainName, blockchainId] = res.splice(1, 3);
      contract && (tmp.contract = contract);
      blockchainName && (tmp.blockchainName = blockchainName);
      blockchainId && (tmp.blockchainId = blockchainId);
      break;
    }
  }
  if (!tmp.blockchainName) {
    throw new Error(
      "the blockchain could not be inferred when parsing the URI, if the URI doesn't have an authority segment (onchfs://<authority>/<cid>/<path>...), a context should be provided based on where the URI was observed. The blockchain needs to be resolved either through the URI or using the context."
    );
  }
  for (const [name, values] of Object.entries(blockchainNameVariants)) {
    if (values.includes(tmp.blockchainName)) {
      tmp.blockchainName = name;
      break;
    }
  }
  if (!tmp.blockchainId) {
    tmp.blockchainId = blockchainDefaultNetwork[tmp.blockchainName];
  }
  if (!tmp.blockchainId) {
    throw new Error(
      `The blockchain identifier could not be inferred from the blockchain name when parsing the authority segment of the URI. This can happen when a blockchain not supported by the onchfs package was provided in the context of the URI resolution, yet a blockchain ID wasn't provided in the context nor could it be found in the URI.`
    );
  }
  if (!tmp.contract) {
    tmp.contract = DEFAULT_CONTRACTS[`${tmp.blockchainName}:${tmp.blockchainId}`];
  }
  if (!tmp.contract) {
    throw new Error(
      `A File Object contract could not be associated with the onchfs URI. This can happen when an unsupported blockchain was provided as a context to the URI resolver, yet no contract was provided in the context, nor could it be parsed from the URI. The URI must resolve to a Smart Contract.`
    );
  }
  return tmp;
}

// src/resolver/proxy.ts
var ResolutionErrors = {
  [400 /* BAD_REQUEST */]: "Bad Request",
  [406 /* NOT_ACCEPTABLE */]: "Resource Cannot be Served",
  [404 /* NOT_FOUND */]: "Not Found",
  [500 /* INTERNAL_SERVER_ERROR */]: "Internal Server Error"
};
function createProxyResolver(resolver) {
  return async (uri) => {
    try {
      if (uri.startsWith("/")) {
        uri = uri.slice(1);
      }
      let components;
      try {
        if (uri.startsWith("onchfs://")) {
          uri = parseSchema(uri);
        }
        components = parseSchemaSpecificPart(uri);
      } catch (err) {
        throw new OnchfsProxyResolutionError(
          `The onchfs URI is invalid: ${err.message}`,
          400 /* BAD_REQUEST */
        );
      }
      let { cid, path, authority } = components;
      let paths = path?.split("/") || [];
      paths = paths.filter((pt) => pt.length > 0);
      let parsedAuthority;
      if (authority) {
        parsedAuthority = parseAuthority(authority);
      }
      let inode;
      let mainInode;
      try {
        inode = mainInode = await resolver.getInodeAtPath(
          cid,
          paths,
          parsedAuthority
        );
        if (!inode) {
          throw new OnchfsProxyResolutionError(
            `Could not find any inode at (${cid}, ${path})`,
            404 /* NOT_FOUND */
          );
        }
      } catch (err) {
        if (err instanceof OnchfsProxyResolutionError) {
          throw err;
        } else {
          throw new OnchfsProxyResolutionError(
            err.message,
            500 /* INTERNAL_SERVER_ERROR */
          );
        }
      }
      if (inode.files) {
        if (inode.files["index.html"]) {
          try {
            inode = await resolver.getInodeAtPath(
              inode.cid,
              ["index.html"],
              parsedAuthority
            );
          } catch (err) {
            throw new OnchfsProxyResolutionError(
              `An error occurred when resolving the index.html file inside the target directory at /${inode.cid}${err.message ? `: ${err.message}` : ""}`,
              500 /* INTERNAL_SERVER_ERROR */
            );
          }
        } else {
          throw new OnchfsProxyResolutionError(
            `the inode at (${cid}, ${path}) is a directory which doesn't contain any index.html file, as such it cannot be served.`,
            406 /* NOT_ACCEPTABLE */
          );
        }
      }
      if (inode.files || !inode) {
        throw new OnchfsProxyResolutionError(
          `could not find a file inode at (${cid}, ${path})`,
          404 /* NOT_FOUND */
        );
      }
      let content;
      try {
        const contentInput = await resolver.readFile(
          inode.cid,
          inode.chunkPointers,
          parsedAuthority
        );
        content = typeof contentInput === "string" ? hexStringToBytes(contentInput) : contentInput;
      } catch (err) {
        throw new OnchfsProxyResolutionError(
          `An error occurred when reading the content of the file of cid ${inode.cid}${err.message ? `: ${err.message}` : ""}`,
          500 /* INTERNAL_SERVER_ERROR */
        );
      }
      let headers;
      const rawMetadataInput = inode.metadata;
      try {
        const rawMetadata = typeof rawMetadataInput === "string" ? hexStringToBytes(rawMetadataInput) : rawMetadataInput;
        headers = decodeMetadata(rawMetadata);
      } catch (err) {
        throw new OnchfsProxyResolutionError(
          `An error occurred when parsing the metadata of the file of cid ${inode.cid}, raw metadata bytes (${rawMetadataInput})${err.message ? `: ${err.message}` : ""}`,
          500 /* INTERNAL_SERVER_ERROR */
        );
      }
      let status = 200 /* OK */;
      const wholeReqPath = components.cid + (components.path ? `/${components.path}` : "");
      if (mainInode.files && !wholeReqPath.endsWith("/") && // in case a CID is followed by a "/" and an empty path, the "/" will
      // disappear during parsing due to the URI specification, however an
      // empty string path will appear, which is the only case where it
      // appears; as such we can test it to cover this edge-case.
      !(components.path === "")) {
        const redirect = "/" + components.cid + (components.path ? `/${components.path}` : "") + "/" + (components.query ? `?${components.query}` : "");
        headers = {
          // preserve the existing headers; we will still be serving the content
          ...headers,
          Location: redirect
        };
        status = 308 /* PERMANENT */;
      }
      return {
        content,
        headers,
        status
      };
    } catch (err) {
      let status, error;
      if (err instanceof OnchfsProxyResolutionError) {
        status = err.status;
        error = {
          code: err.status,
          name: ResolutionErrors[err.status],
          message: err.message
        };
      } else {
        status = 500 /* INTERNAL_SERVER_ERROR */;
        error = {
          code: 500 /* INTERNAL_SERVER_ERROR */,
          name: ResolutionErrors[500 /* INTERNAL_SERVER_ERROR */]
        };
      }
      return {
        status,
        // we produce a basic html error page for proxy implementations which
        // just want to forward the response
        content: new TextEncoder().encode(
          `<h1>${status} ${error.name}</h1>${error.message ? `<p>${err.message}</p>` : ""}`
        ),
        // same with headers
        headers: {
          "content-type": "text/html; charset=utf-8"
        },
        error
      };
    }
  };
}

// src/uri/index.ts
var uri_exports = {};
__export(uri_exports, {
  parse: () => parseURI,
  utils: () => utils3
});
var utils3 = {
  parseAuthority,
  parseSchema,
  parseSchemaSpecificPart
};

// src/index.ts
var Onchfs = {
  files: files_exports,
  inscriptions: inscriptions_exports,
  metadata: metadata_exports,
  resolver: resolver_exports,
  uri: uri_exports,
  utils: utils_exports
};
var src_default = Onchfs;
if (typeof window !== "undefined") {
  ;
  window.Onchfs = Onchfs;
}
export {
  ProxyResolutionStatusErrors,
  ProxyResolutionStatusRedirect,
  ProxyResolutionStatusSuccess,
  blockchainNames,
  src_default as default
};
//# sourceMappingURL=index.mjs.map