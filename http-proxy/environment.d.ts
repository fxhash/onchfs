declare global {
  namespace NodeJS {
    interface ProcessEnv {
			NODE_ENV: string
      PORT: string
      MAX_FILE_SIZE: string

      API_INDEXER: string
      API_EXTRACT: string

      IPFS_CLUSTER_API: string
      IPFS_CLUSTER_GATEWAY: string

      AUTHENTIFICATION_SALT: string
      GENERATIVE_METADATA_VERSION: string

      NODE_TLS_REJECT_UNAUTHORIZED: string

      PINATA_API_BASE_URL: string
      PINATA_API_JWT: string

      TRACING_ENABLED: "0"|"1"
      OPEN_TELEMETRY_TARGET: string
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}