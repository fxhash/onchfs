/**
 * List of the blockchain supported officially. While the protocol can be
 * deployed anywhere, the URI resolution is more easily inferred from the
 * supported deployments.
 */
export const blockchainNames = ["tezos", "ethereum"] as const
export type BlockchainNames = (typeof blockchainNames)[number]

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
 * The different segments of the URI Schema-Specific Component:
 * [ authority "/" ] cid [path] [ "?" query ] [ "#" fragment ]
 */
export interface URISchemaSpecificParts {
  cid: string
  authority?: string
  path?: string
  query?: string
  fragment?: string
}
