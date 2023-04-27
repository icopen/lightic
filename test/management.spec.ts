import { Principal } from '@dfinity/principal'
import { assert } from 'chai'
import { LedgerHelper, TestContext, getAccount, hexToBytes } from '../src'
import { parse_candid_to_js, parse_candid_to_ts } from '../src/wasm_tools/pkg/wasm_tools'
import fs from 'fs'

const context = new TestContext()

describe('Management Canister', function () {
  it('raw_rand', async function () {
    let did = fs.readFileSync('./src/management_canister.did').toString()
    let ts = parse_candid_to_js(did)
    fs.writeFileSync('mgmt.did.js', ts)

    let result = await context.getAgent(Principal.anonymous()).getActor('aaaaa-aa').raw_rand()
    console.log(result)
  })
})

