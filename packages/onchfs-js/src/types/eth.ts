export enum EthInodeType {
  DIRECTORY = 0,
  FILE = 1,
}

export type EthInodeFile = {
  inodeType: EthInodeType.FILE
  file: {
    metadata: `0x${string}`
    chunkChecksums: `0x${string}`[]
  }
}

export type EthInodeDirectory = {
  inodeType: EthInodeType.DIRECTORY
  directory: {
    filenames: string[]
    fileChecksums: `0x${string}`[]
  }
}

export type EthInode = EthInodeFile | EthInodeDirectory
