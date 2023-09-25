export { createProxyResolver as create } from "./proxy"

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
export const custom = () => {
  throw new Error("TODO implement!")
}
