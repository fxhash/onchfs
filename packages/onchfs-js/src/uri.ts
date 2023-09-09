/**
 * List of the blockchain supported officially. While the protocol can be
 * deployed anywhere, the URI resolution is more easily inferred from the
 * supported deployments.
 */
export const blockchainNames = ["tezos", "ethereum"] as const
export type BlockchainNames = typeof blockchainNames[number]

/**
 * The URI Authority defines the "host" of an asset, in this case a combination
 * of a blockchain (represented by string indentifier & chain ID) & a contract
 * on such blockchain compliant to the onchfs specifications.
 */
export interface URIAuthority {
  blockchainName: string
  contract: string
  blockchainId: string
}

/**
 * Provides a full broken-down representation of the URI in a formatted way.
 * While the authority is an optionnal segment when writing an onchfs URI, it
 * must be inferred during the resolution by providing a context.
 */
export interface URIComponents {
  cid: string
  authority: URIAuthority
  path?: string
  query?: string
  fragment?: string
}

/**
 * Some URI Context needs to be provided for most URI resolutions, as often
 * onchfs URI will rely of the context in which they are stored/seen to infer
 * their resolution. For instance, a base onchfs URI stored on ETH mainnet will
 * expect solvers to point to the main onchfs ETH contract.
 */
export type URIContext = Pick<URIAuthority, "blockchainName"> &
  Pick<Partial<URIAuthority>, "blockchainId" | "contract">

/**
 * TODO: insert true values here.
 * A naive map of the "official" onchfs Smart Contracts.
 */
export const defaultContractsMap: Record<string, string> = {
  "tezos:mainnet": "KT1WvzYHCNBvDSdwafTHv7nJ1dWmZ8GCYuuC",
  "tezos:ghostnet": "KT1XZ2FyRNtzYCBoy18Rp7R9oejvFSPqkBoy",
  "ethereum:1": "b0e58801d1b4d69179b7bc23fe54a37cee999b09",
  "ethereum:5": "fcfdfa971803e1cc201f80d8e74de71fddea6551",
}

/**
 * Proper charsets tightly following the spec
 */

const LOW_ALPHA = "a-z"
const HI_ALPHA = "A-Z"
const ALPHA = LOW_ALPHA + HI_ALPHA
const DIGIT = "0-9"
const SAFE = "$\\-_.+"
const EXTRA = "!*'(),~"
const HEX_CHARSET = "A-Fa-f0-9"
const LOW_RESERVED = ";:@&="
const RESERVED = LOW_RESERVED + "\\/?#"
const UNRESERVED = ALPHA + DIGIT + SAFE + EXTRA
const PCT_ENCODED = `%[${HEX_CHARSET}]{2}`
const UCHAR = `(?:(?:[${UNRESERVED}])|(?:${PCT_ENCODED}))`
const XCHAR = `(?:(?:[${UNRESERVED}${RESERVED}])|(?:${PCT_ENCODED}))`

const URI_CHARSET = XCHAR
const B58_CHARSET = "1-9A-HJ-NP-Za-km-z"
const AUTHORITY_CHARSET = `${HEX_CHARSET}${B58_CHARSET}.a-z:`
const SEG_CHARSET = `(?:(?:${UCHAR})|[${LOW_RESERVED}])`
const QUERY_CHARSET = `(?:${SEG_CHARSET}|\\/|\\?)`

/**
 * Parses an absolute onchfs URI, following its ABNF specification. If any part
 * of the URI is mal-constructed, or if some context is missing to fully
 * resolve it, this function will throw with an error indicating where the
 * resolution has failed.
 *
 * @dev The resolution happens in 3 distinctive steps, each breaking down the
 * URI into smaller components which can be parsed more easily:
 *
 * * parseSchema
 *   <onchfs>://<schema-specific-part>
 *   Splits the URI into it's 2 biggest sections, extracting the schema from
 *   the schema-specific part.
 * * parseSchemaSpecificPart
 *   [ authority "/" ] cid [path] [ "?" query ] [ "#" fragment ]
 *   Splits the schema-specific part into its various logical segments. This
 *   step validate the general structure of the URI as well.
 * * parseAuthority
 *   [ contract-address "." ] blockchain-name [ ":" chainid ]
 *   The authority segment is parsed, and using the context provided by the
 *   consumer it tries to resolve the authority.
 *
 * @param uri An absolute onchfs URI to be parsed
 * @param context The context in which the URI has been observed; such context
 * may be required for resolving the URI as it might be written in its short
 * form to save storage space, relying on inference from context; which is
 * valid part of the spec designed to optimise storage costs.
 * @returns A fully formed URI Components object, describing the various URI
 * components.
 */
export function parseURI(uri: string, context?: URIContext): URIComponents {
  try {
    // pass the first layer: validates the high level format of the URI:
    // onchfs://<schema-specific-part>
    // and returns the schema-specific part if the URI has a general valid
    // format.
    const schemaSpecificPart = parseSchema(uri)
    // parse the schema-specific part
    // [ authority "/" ] cid [path] [ "?" query ] [ "#" fragment ]
    const schemaSegments = parseSchemaSpecificPart(schemaSpecificPart)
    // parse the authority
    const authority = parseAuthority(schemaSegments.authority, context)

    return {
      ...schemaSegments,
      cid: schemaSegments.cid.toLowerCase(),
      authority: authority,
    }
  } catch (err: any) {
    // catch to prefix low-level error message with generic message
    throw new Error(
      `Error when parsing the URI "${uri}" as a onchfs URI: ${err.message}`
    )
  }
}

/**
 * 1st order URI parsing; checks if the overall URI is valid by looking at the
 * protocol, and the schema-specific part. If any character in the URI invalid
 * (not part of the allowed URI characters), will throw.
 * Will also thrown if the general pattern doesn't not comply with onchfs URIs.
 * @param uri The URI to parse
 * @returns The URI schema-specific part
 */
export function parseSchema(uri: string): string {
  const regex = new RegExp(`^(onchfs):\/\/(${URI_CHARSET}{64,})$`)
  const results = regex.exec(uri)

  // result is null, the regex missed
  if (!results) {
    throw new Error(
      `general onchfs URI format is invalid / Pattern didn't match: ${regex.toString()}`
    )
  }

  return results[2]
}

/**
 * The different segments of the URI Schema-Specific Component:
 * [ authority "/" ] cid [path] [ "?" query ] [ "#" fragment ]
 */
export interface URISchemaSpecificComponent {
  cid: string
  authority?: string
  path?: string
  query?: string
  fragment?: string
}

/**
 * Parses the schema-specific component (onchfs://<schema-specific-component>)
 * into a list of sub-segments based on the onchfs URI specification.
 * [ authority "/" ] cid [path] [ "?" query ] [ "#" fragment ]
 * @param uriPart THe URI Schema-Specific Component
 * @returns An object with the different segments isolated
 */
export function parseSchemaSpecificPart(uriPart: string) {
  const authorityReg = `([${AUTHORITY_CHARSET}]*)\\/`
  const cidReg = `[${HEX_CHARSET}]{64}`
  const pathReg = `${SEG_CHARSET}*(?:\\/${SEG_CHARSET}*)*`
  const queryReg = `\\?(${QUERY_CHARSET}*)`
  const fragReg = `#(${QUERY_CHARSET}*)`

  // isolates each segment of the URI based on their pattern, including
  // cardinality of every segment
  const regex = new RegExp(
    `^(?:${authorityReg})?(${cidReg})(?:\\/(${pathReg}))?(?:${queryReg})?(?:${fragReg})?$`
  )

  const res = regex.exec(uriPart)

  if (!res) {
    throw new Error(
      `the URI schema specific component seems to be invalid. "${uriPart}" should respect the following pattern: ${regex.toString()}`
    )
  }

  const [_, authority, cid, path, query, fragment] = res

  return {
    authority,
    cid,
    path,
    query,
    fragment,
  }
}

const blockchainAuthorityParsers: Record<BlockchainNames, () => RegExp> = {
  tezos: () =>
    new RegExp(
      `^(?:(KT(?:1|2|3|4)[${B58_CHARSET}]{33})\\.)?(tezos|tez|xtz)(?::(ghostnet|mainnet))?$`
    ),
  ethereum: () =>
    new RegExp(`^(?:([${HEX_CHARSET}]{40})\\.)?(ethereum|eth)(?::([0-9]+))?$`),
}

type BlockchainNameVariants = {
  [K in BlockchainNames]: [K, ...string[]]
}
const blockchainNameVariants: BlockchainNameVariants = {
  tezos: ["tezos", "tez", "xtz"],
  ethereum: ["ethereum", "eth"],
}

type BlockchainDefaultNetwork = {
  [K in BlockchainNames]: string
}
const blockchainDefaultNetwork: BlockchainDefaultNetwork = {
  tezos: "mainnet",
  ethereum: "1",
}

/**
 * Given the string segment of the authority (or lack thereof) and a context in
 * which the URI exists, resolves the authority object (blockchain, chainid,
 * smart contract address) in which the object is supposed to be stored.
 *
 * The resolution is initialized with the provided context, after which the
 * authority segment of the URI (onchfs://<authority>/<cid>/<path>...) is parsed
 * and eventually overrides the given context (as some resources living in a
 * given context are allowed to reference assets existing in other contexts).
 *
 * If some authority components are still missing after the parsing, the
 * blockchain name is used to infer (chainid, contract address). In case
 * only contract is missing, it is inferred from (blockchain name, chainid).
 *
 * If any component is missing at the end of this process (ie: cannot be found
 * in the context, URI, and cannot be inferred), this functions throws.
 *
 * @param authority The string segment of the authority in the URI. If the
 * authority is missing from the CID, a context must be provided to resolve
 * the authority component.
 * @param context The context in which the authority is loaded. If such context
 * is not provided, the authority segment must have a blockchain name so that
 * the authority can be resolved using defaults.
 * @returns An object containing all the segments of the authority. If segment
 * doesn't exist, the context provided will be used to infer all the authority
 * components.
 */
export function parseAuthority(
  authority?: string,
  context?: URIContext
): URIAuthority {
  // initialise the authority object to the given context
  let tmp: Partial<URIAuthority> = { ...context }

  if (authority) {
    // loop through every blockchain and use its authority-regex to identify
    // the different parts, potentially
    let regex: RegExp, res: RegExpExecArray | null
    for (const name of blockchainNames) {
      // generate the blockchain-related regex and parse the authority
      regex = blockchainAuthorityParsers[name]()
      res = regex.exec(authority)
      // no result; move to next blockchain
      if (!res) continue
      // results are in slots [1;3] - assign to temp object being parsed
      const [contract, blockchainName, blockchainId] = res.splice(1, 3)
      contract && (tmp.contract = contract)
      blockchainName && (tmp.blockchainName = blockchainName)
      blockchainId && (tmp.blockchainId = blockchainId)
      break
    }
  }

  // at this stage, if there isn't a blockchain name, then we can throw as the
  // network is missing (either from the URI or the context)
  if (!tmp.blockchainName) {
    throw new Error(
      "the blockchain could not be inferred when parsing the URI, if the URI doesn't have an authority segment (onchfs://<authority>/<cid>/<path>...), a context should be provided based on where the URI was observed. The blockchain needs to be resolved either through the URI or using the context."
    )
  }
  // normalize blockchain name into its cleanest and most comprehensible form
  for (const [name, values] of Object.entries(blockchainNameVariants)) {
    if (values.includes(tmp.blockchainName)) {
      tmp.blockchainName = name
      break
    }
  }

  // if blockchain ID is missing, then assign the default blockchain ID
  // associated with the asset, which is mainnet
  if (!tmp.blockchainId) {
    tmp.blockchainId = blockchainDefaultNetwork[tmp.blockchainName]
  }
  // if no blockchain ID at this stage, the blockchain name cannot be mapped
  // to a given blockchain ID
  if (!tmp.blockchainId) {
    throw new Error(
      `The blockchain identifier could not be inferred from the blockchain name when parsing the authority segment of the URI. This can happen when a blockchain not supported by the onchfs package was provided in the context of the URI resolution, yet a blockchain ID wasn't provided in the context nor could it be found in the URI.`
    )
  }

  // if contract is missing, default one for blockchain (name, id) is picked
  if (!tmp.contract) {
    tmp.contract =
      defaultContractsMap[`${tmp.blockchainName}:${tmp.blockchainId}`]
  }
  // if no contract at this stage, it's mostly because some unofficial context
  // has been forced, yet no contract was given in the context
  if (!tmp.contract) {
    throw new Error(
      `A File Object contract could not be associated with the onchfs URI. This can happen when an unsupported blockchain was provided as a context to the URI resolver, yet no contract was provided in the context, nor could it be parsed from the URI. The URI must resolve to a Smart Contract.`
    )
  }

  return tmp as URIAuthority
}
