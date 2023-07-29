import { type Principal } from '@dfinity/principal'
import { type TestContext } from '../test_context'
import fs from 'fs'
import pako from 'pako'
import { type WasmCanister } from '../wasm_canister'
import { getAccount } from '../utils'
import { HttpPromise } from './ledger_helper'

const latestRelease = 'f02cc38677905e24a9016637fddc697039930808'

export class NNSHelper {
  public cmc: WasmCanister
  public ledger: Principal
  public owner: Principal

  static async checkAndDownload (): Promise<void> {
    if (!fs.existsSync('./cache')) {
      fs.mkdirSync('./cache')
    }
    if (!fs.existsSync('./cache/cycles-minting-canister.wasm')) {
      const prom = new HttpPromise()

      console.log('Downloading latest cycles minting canister package, commit: ' + latestRelease)

      const url = 'https://download.dfinity.systems/ic/' + latestRelease + '/canisters/cycles-minting-canister.wasm.gz'
      const res = await prom.get(url)

      const inflated = pako.inflate(res)

      console.log('Cycles minting canister module downloaded')

      fs.writeFileSync('./cache/cycles-minting-canister.wasm', inflated)
    }
  }

  static getSendArgs (target: Principal, amount: number): any {
    const canisterAccount = getAccount(target, 0)
    const args = {
      amount: { e8s: amount },
      memo: 0,
      fee: { e8s: 10_000 },
      from_subaccount: [],
      to: canisterAccount.toUint8Array(),
      created_at_time: []
    }
    return args
  }

  static async defaults (context: TestContext, ledger: Principal, owner: Principal): Promise<NNSHelper> {
    await NNSHelper.checkAndDownload()

    const cmc = await context.deploy('./cache/cycles-minting-canister.wasm', {
      initArgs: [{
        ledger_canister_id: ledger,
        governance_canister_id: owner,
        minting_account_id: [],
        last_purged_notification: [],
        exchange_rate_canister: [],
      }]
    }) as WasmCanister

    const helper: NNSHelper = {
      cmc,
      ledger,
      owner
    }

    return helper
  }
}
