import { Principal } from '@dfinity/principal'
import { assert } from 'chai'
import { TestContext, getAccount, LedgerHelper } from '../src'

const context = new TestContext()

describe('LightIc', function () {
  it('list installed canisters', async function () {
    await context.deploy('./spec_test/target/wasm32-unknown-unknown/release/spec_test.wasm')
    await context.deploy('./spec_test/target/wasm32-unknown-unknown/release/spec_test.wasm')
    await context.deploy('./spec_test/target/wasm32-unknown-unknown/release/spec_test.wasm')
    await context.deploy('./spec_test/target/wasm32-unknown-unknown/release/spec_test.wasm')
    await context.deploy('./spec_test/target/wasm32-unknown-unknown/release/spec_test.wasm')

    const canisters = context.replica.get_canisters()

    assert.equal(canisters.length, 5)
  })

  afterEach(function () {
    // Clean LightIc
    context.clean()
  })
})

describe('Ledger Helper', function () {
  it('get wasm', async function () {
    await LedgerHelper.checkAndDownload()
  })
})

describe('ic0', function () {
  afterEach(function () {
    // Clean LightIc
    context.clean()
  })

  describe('caller', function () {
    it('should match', async function () {
      const caller = Principal.anonymous()
      const canister = await context.deploy('./spec_test/target/wasm32-unknown-unknown/release/spec_test.wasm')
      const actor = context.getAgent(caller).getActor(canister)

      const result = await actor.test_caller() as any[]

      assert.equal(caller.toString(), result.toString())
    })
  })
  describe('id', function () {
    it('should match', async function () {
      const caller = Principal.anonymous()
      const canister = await context.deploy('./spec_test/target/wasm32-unknown-unknown/release/spec_test.wasm')
      const actor = context.getAgent(caller).getActor(canister)
      const result = await actor.test_id() as any[]

      assert.equal(canister.get_id().toString(), result.toString())
    })
  })

  describe('trap', function () {
    it('should trap', async function () {
      const caller = Principal.anonymous()
      const canister = await context.deploy('./spec_test/target/wasm32-unknown-unknown/release/spec_test.wasm')
      const actor = context.getAgent(caller).getActor(canister)
      try {
        await actor.test_trap()
      } catch (e) {
        console.log(e)
      }

      await actor.test_id()
    })
  })

  describe('inter canister call', function () {
    it('should pass', async function () {
      const mintingPrincipal = Principal.fromText('3zjeh-xtbtx-mwebn-37a43-7nbck-qgquk-xtrny-42ujn-gzaxw-ncbzw-kqe')
      const invokingPrincipal = Principal.fromText('7gaq2-4kttl-vtbt4-oo47w-igteo-cpk2k-57h3p-yioqe-wkawi-wz45g-jae')
      const targetPrincipal = Principal.fromText('o2ivq-5dsz3-nba5d-pwbk2-hdd3i-vybeq-qfz35-rqg27-lyesf-xghzc-3ae')

      const targetAccount = getAccount(targetPrincipal, 0)

      // Download and deploy ledger canister
      const ledgerHelper = await LedgerHelper.defaults(context, mintingPrincipal, invokingPrincipal)
      const ledgerActor = context.getAgent(invokingPrincipal).getActor(ledgerHelper.ledger)

      // Deploy our test canister
      const canister = await context.deploy('./spec_test/target/wasm32-unknown-unknown/release/spec_test.wasm')
      const actor = context.getAgent(invokingPrincipal).getActor(canister)

      // Supply our canister with 1_000_000 of ICP
      const args = LedgerHelper.getSendArgs(canister.get_id(), 1_000_000)
      await ledgerActor.transfer(args)

      // Invoke inter canister call
      const result = await actor.test_inter_canister(
        ledgerHelper.ledger.get_id(),
        targetAccount.toHex(),
        100_000)

      console.log(result)
    })
  })
})
