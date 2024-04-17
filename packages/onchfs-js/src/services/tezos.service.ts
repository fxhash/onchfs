import {
  ContractAbstraction,
  ContractProvider,
  TezosToolkit,
} from "@taquito/taquito"

function shuffle<T>(array: T[]): T[] {
  const out = [...array]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export class TezosService {
  private tezosToolkit: TezosToolkit
  private rpcNodes: string[]
  private contractsCache: Record<
    string,
    ContractAbstraction<ContractProvider>
  > = {}

  constructor(rpcs: string[]) {
    this.tezosToolkit = new TezosToolkit(rpcs[0])
    this.rpcNodes = rpcs
  }

  async call<T>(
    address: string,
    callback: (contract: ContractAbstraction<ContractProvider>) => Promise<T>
  ): Promise<T> {
    for (const rpc of shuffle(this.rpcNodes)) {
      this.tezosToolkit.setProvider({ rpc })
      try {
        const contract = await this.getContract(address)
        return await callback(contract)
      } catch (err) {
        if (!this.canErrorBeCycled(err)) throw err
        console.error(`RPC ${rpc} failed: ${err}, trying next...`)
      }
    }
    throw new Error("all RPCs failed")
  }

  async getContract(
    address: string
  ): Promise<ContractAbstraction<ContractProvider>> {
    if (!this.contractsCache[address]) {
      this.contractsCache[address] =
        await this.tezosToolkit.contract.at(address)
    }
    return this.contractsCache[address]
  }

  // given an error, returns true if request can be cycled to another RPC node
  private canErrorBeCycled(err: any): boolean {
    return (
      err &&
      (err.name === "HttpRequestFailed" ||
        err.status === 500 ||
        err.status === 408 ||
        err.status === 429)
    )
  }
}
