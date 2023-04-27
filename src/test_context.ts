import { type Principal } from '@dfinity/principal'
import { MockAgent } from './mock_agent'
import { loadWasm } from './instrumentation'
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

  compiled: Record<string, WebAssembly.Module>

  constructor () {
    this.replica = new ReplicaContext()
    this.compiled = {}
  }

  clean (): void {
    this.replica.clean()
  }

  getAgent (identity: Principal): MockAgent {
    const agent = new MockAgent(this.replica, identity)

    return agent
  }

  async deploy (filename: string, opts?: DeployOptions): Promise<Canister> {
    let module = this.compiled[filename]

    if (opts?.candid !== undefined) {
      if (fs.existsSync(opts.candid)) {
        opts.candid = fs.readFileSync(opts.candid).toString()
      }
    }

    if (module === undefined) {
      module = await loadWasm(filename)
      this.compiled[filename] = module
    }

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
