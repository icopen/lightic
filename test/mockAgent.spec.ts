import { Actor } from '@dfinity/agent'
import { Principal } from '@dfinity/principal'
import { assert } from 'chai'
import { TestContext, getAccount, LedgerHelper } from '../src'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const agent = require('@dfinity/agent/lib/cjs/utils/bls')
agent.blsVerify = async (pk: Uint8Array, sig: Uint8Array, msg: Uint8Array): Promise<boolean> => {
  return true
}

const context = new TestContext()

describe('Mock Agent', function () {
  it('get_id with @dfinity actor', async function () {
    const caller = Principal.anonymous()
    const canister = await context.deploy('./spec_test/target/wasm32-unknown-unknown/release/spec_test.wasm')
    const actor = Actor.createActor(canister.getIdlBuilder(), {
      agent: context.getAgent(caller),
      canisterId: canister.get_id()
    })

    const result = await actor.test_caller() as any[]

    assert.equal(caller.toString(), result.toString())
  })

  it('test_inter_canister with @dfinity actor', async function () {
    const mintingPrincipal = Principal.fromText('3zjeh-xtbtx-mwebn-37a43-7nbck-qgquk-xtrny-42ujn-gzaxw-ncbzw-kqe')
    const invokingPrincipal = Principal.fromText('7gaq2-4kttl-vtbt4-oo47w-igteo-cpk2k-57h3p-yioqe-wkawi-wz45g-jae')
    const targetPrincipal = Principal.fromText('o2ivq-5dsz3-nba5d-pwbk2-hdd3i-vybeq-qfz35-rqg27-lyesf-xghzc-3ae')

    const targetAccount = getAccount(targetPrincipal, 0)

    // Download and deploy ledger canister
    const ledgerHelper = await LedgerHelper.defaults(context, mintingPrincipal, invokingPrincipal)
    const ledgerActor = context.getAgent(invokingPrincipal).getActor(ledgerHelper.ledger)
    // const ledgerActor = Actor.createActor(ledgerHelper.ledger.getIdlBuilder(), {
    //   agent: context.getAgent(invokingPrincipal),
    //   canisterId: ledgerHelper.ledger.get_id()
    // })
    // Deploy our test canister
    const canister = await context.deploy('./spec_test/target/wasm32-unknown-unknown/release/spec_test.wasm')
    const actor = Actor.createActor(canister.getIdlBuilder(), {
      agent: context.getAgent(invokingPrincipal),
      canisterId: canister.get_id()
    })

    // Supply our canister with 1_000_000 of ICP
    const args = LedgerHelper.getSendArgs(canister.get_id(), 1_000_000)
    await ledgerActor.transfer(args)

    // Invoke inter canister call
    const result = await actor.test_inter_canister(
      ledgerHelper.ledger.get_id(),
      targetAccount.toHex(),
      100_000)

    console.log('returns!!!')

    console.log(result)
  })
})
