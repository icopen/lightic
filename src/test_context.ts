import { type Principal } from '@dfinity/principal'
import { MockAgent } from './mock_agent'
import { loadWasmFromFile } from './instrumentation'
import { ReplicaContext } from './replica_context'
import { Canister } from './canister'
import fs from 'fs'

export interface DeployOptions {
  initArgs?: any
  candid?: string
  id?: string
  caller?: Principal
}

export function getGlobalTestContext(): TestContext {
  if (global.testContext === undefined) {
    global.testContext = new TestContext();
  }

  return global.testContext as TestContext
}

export class TestContext {
  replica: ReplicaContext

  constructor () {
    this.replica = new ReplicaContext()
  }

  clean (): void {
    this.replica.clean()
  }

  getAgent (identity: Principal): MockAgent {
    const agent = new MockAgent(this.replica, identity)

    return agent
  }

  async deploy (filename: string, opts?: DeployOptions): Promise<Canister> {
    if (opts?.candid !== undefined) {
      if (fs.existsSync(opts.candid)) {
        opts.candid = fs.readFileSync(opts.candid).toString()
      }
    }

    const module = await loadWasmFromFile(filename)

    const result = await this.replica.install_canister(module, {
      initArgs: opts?.initArgs, 
      candid: opts?.candid,
      id: opts?.id,
      caller: opts?.caller
    })

    return result
  }

  // async deployWithId (filename: string, id: Principal, initArgs: any = null): Promise<Canister> {
  //   throw new Error('Not implemented')
  // }
}
