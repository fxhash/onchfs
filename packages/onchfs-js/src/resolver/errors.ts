import { ProxyResolutionStatusErrors } from "@/types/resolver"

/**
 * Error thrown during the resolution of a relative URI by the proxy.
 */
export class OnchfsProxyResolutionError extends Error {
  constructor(message: string, public status: ProxyResolutionStatusErrors) {
    super(message)
    this.name = "OnchfsProxyResolutionError"
  }
}
