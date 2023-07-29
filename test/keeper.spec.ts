import { assert } from 'chai'
import { TestContext } from '../src'
import { WasmCanister } from '../src/wasm_canister'
import { Principal } from '@dfinity/principal'

const context = new TestContext()

describe('Keeper', function () {
  afterEach(function () {
    // Clean LightIc
    context.clean()
  })

  it('test set ledger', async function () {

    const owner = Principal.fromText('3zjeh-xtbtx-mwebn-37a43-7nbck-qgquk-xtrny-42ujn-gzaxw-ncbzw-kqe')
    
    const canister = await context.deploy('./cache/keeper.wasm')
    const actor = context.getAgent(owner).getActor(canister);

    await actor.set_ledger_canister(owner);

  })

  it('test set token', async function () {

    const owner = Principal.fromText('3zjeh-xtbtx-mwebn-37a43-7nbck-qgquk-xtrny-42ujn-gzaxw-ncbzw-kqe')
    
    const canister = await context.deploy('./cache/keeper.wasm')
    const actor = context.getAgent(owner).getActor(canister);

    await actor.set_token_canister(owner);

  })
})
