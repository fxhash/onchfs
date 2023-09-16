import * as files from "@/files"
import * as inscriptions from "@/inscriptions"
import * as metadata from "@/metadata"
import * as resolver from "@/resolver"
import * as uri from "@/uri"

const Onchfs = {
  files,
  inscriptions,
  metadata,
  resolver,
  uri,
}

export default Onchfs

// export all types for dev convenience
export * from "@/types"

// Used to expose the library to the browser build version
if (typeof window !== "undefined") {
  ;(window as any).Onchfs = Onchfs
}
