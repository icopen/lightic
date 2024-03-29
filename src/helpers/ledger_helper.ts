import { Principal } from '@dfinity/principal'
import { type TestContext } from '../test_context'
import fs from 'fs'
import https from 'node:https'
import type http from 'node:http'
import url from 'url'
import pako from 'pako'
import { type WasmCanister } from '../wasm_canister'
import { getAccount } from '../utils'
import { sha256 } from 'js-sha256'
import { MockAgent } from '../mock_agent'

export const latestRelease = 'f02cc38677905e24a9016637fddc697039930808'

export class HttpPromise {
  async get (url): Promise<Uint8Array> {
    const [, , content] = await this._makeRequest('GET', url, {})

    // if (code === 301) {
    //   response.headers.location
    // }

    return content
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  _makeRequest (method, urlString, options): Promise<[number, http.IncomingMessage, any]> {
    // create a new Promise
    return new Promise<[number, http.IncomingMessage, any]>((resolve, reject) => {
      /* Node's URL library allows us to create a
       * URL object from our request string, so we can build
       * our request for http.get */
      const parsedUrl = new url.URL(urlString)

      // const requestOptions = this._createOptions(method, parsedUrl)
      const request = https.get(parsedUrl, res => {
        this._onResponse(res, resolve, reject)
      })

      /* if there's an error, then reject the Promise
       * (can be handled with Promise.prototype.catch) */
      request.on('error', reject)

      request.end()
    })
  }

  // // the options that are required by http.get
  // _createOptions (method, url: url.URL): http.RequestOptions {
  //   http.Req
  //   return {
  //     hostname: url.hostname,
  //     path: url.pathname,
  //     protocol: url.protocol,
  //     port: url.port,
  //     method
  //   }
  // }

  /* once http.get returns a response, build it and
* resolve or reject the Promise */
  _onResponse (response: http.IncomingMessage, resolve: any, reject: any): void {
    if (response.statusCode === undefined) return
    const hasResponseFailed = response.statusCode >= 400

    const chunks: Uint8Array[] = []

    if (hasResponseFailed) {
      reject(`Request to ${response.url ?? ''} failed with HTTP ${response.statusCode}`)
    }

    /* the response stream's (an instance of Stream) current data. See:
     * https://nodejs.org/api/stream.html#stream_event_data */
    response.on('data', chunk => {
      chunks.push(chunk)
    })

    // once all the data has been read, resolve the Promise
    response.on('end', () => {
      // Get the total length of all arrays.
      let length = 0
      for (const item of chunks) {
        length += item.length
      }

      // Create a new array with total length and merge all source arrays.
      const mergedArray = new Uint8Array(length)
      let offset = 0
      for (const item of chunks) {
        mergedArray.set(item, offset)
        offset += item.length
      }

      resolve([response.statusCode, response, mergedArray])
    })
  }
}

export class LedgerHelper {
  public ledger: WasmCanister
  public minter: Principal
  public owner: Principal

  constructor (ledger: WasmCanister, minter: Principal, owner: Principal) {
    this.ledger = ledger
    this.minter = minter
    this.owner = owner
  }

  async faucet(target: Principal, amount: number): Promise<void> {
    // const args = LedgerHelper.getSendArgs(target, amount)
    // await this.ledger.update('send_dfx', args)
  }

  async balanceOf(target: Principal): Promise<bigint> {
    const args = {
      account: getAccount(target, 0).toUint8Array()
    }

    const agent = new MockAgent(this.ledger.state.replica, Principal.anonymous())
    const actor = agent.getActor(this.ledger)

    const result = await actor.account_balance(args) as any
    return result.e8s
  }

  static async checkAndDownload (commit: string): Promise<void> {
    if (!fs.existsSync('./cache')) {
      fs.mkdirSync('./cache')
    }
    if (!fs.existsSync('./cache/ledger.wasm')) {
      const prom = new HttpPromise()

      console.log('Downloading latest ledger package, commit: ' + commit)

      const url = 'https://download.dfinity.systems/ic/' + commit + '/canisters/ledger-canister_notify-method.wasm.gz'
      const res = await prom.get(url)

      const hash = sha256(res)
      console.log('Hash: ' + hash);

      const inflated = pako.inflate(res)

      console.log('Ledger module downloaded')

      fs.writeFileSync('./cache/ledger.wasm', inflated)
    }
  }

  static getSendArgs (target: Principal, amount: number, memo = 0): any {
    const canisterAccount = getAccount(target, 0)
    const args = {
      amount: { e8s: amount },
      memo: memo,
      fee: { e8s: 10_000 },
      from_subaccount: [],
      to: canisterAccount.toUint8Array(),
      created_at_time: []
    }
    return args
  }

  static async defaults (context: TestContext, minter: Principal, owner: Principal): Promise<LedgerHelper> {
    await LedgerHelper.checkAndDownload(latestRelease)

    const mintingAccount = getAccount(minter, 0)
    const invokingAccount = getAccount(owner, 0)

    const ledger = await context.deploy('./cache/ledger.wasm', {
      initArgs: [{
        minting_account: mintingAccount.toHex(),
        initial_values: [[invokingAccount.toHex(), { e8s: 100_000_000_000 }]],
        send_whitelist: [],
        token_symbol: [],
        token_name: [],
        transfer_fee: [{ e8s: 10_000 }],
        transaction_window: [],
        max_message_size_bytes: [],
        icrc1_minting_account: [],
        archive_options: []
      }],
      id: 'ryjl3-tyaaa-aaaaa-aaaba-cai'
    }) as WasmCanister

    const helper: LedgerHelper = new LedgerHelper(ledger, minter, owner);

    return helper
  }
}
