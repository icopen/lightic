import { Principal } from '@dfinity/principal'
import { assert } from 'chai'
import { TestContext, getAccount, hexToBytes } from '../src'

const context = new TestContext()

describe('Ledger', function () {
  afterEach(function () {
    // Clean LightIc
    context.clean()
  })

  it('install ledger canister', async function () {
    // const principal = Principal.fromText('dkzjk-sxlxb-cdh5x-rtexw-7y54l-yfwbq-rhayo-ufw34-lugle-j4s23-4ae')
    const account = '515724c3f0976accf3ad9cf4616f7b8fc734749d04847eec21ee3ccb8e64f0a0'

    await context.deploy('./cache/ledger.wasm', {
      initArgs: [{
        minting_account: account,
        initial_values: [[account, { e8s: 100_000_000_000 }]],
        send_whitelist: [],
        token_symbol: [],
        token_name: [],
        transfer_fee: [],
        transaction_window: [],
        max_message_size_bytes: [],
        icrc1_minting_account: [],
        archive_options: []
      }]
    })
  })

  it('check account balance', async function () {
    const account = '515724c3f0976accf3ad9cf4616f7b8fc734749d04847eec21ee3ccb8e64f0a0'

    const canister = await context.deploy('./cache/ledger.wasm', {
      initArgs: [{
        minting_account: account,
        initial_values: [[account, { e8s: 100_000_000_000 }]],
        send_whitelist: [],
        token_symbol: [],
        token_name: [],
        transfer_fee: [],
        transaction_window: [],
        max_message_size_bytes: [],
        icrc1_minting_account: [],
        archive_options: []
      }]
    })

    const hexAccount = hexToBytes(account)

    const actor = context.getAgent(Principal.anonymous()).getActor(canister)

    // const actor = canister.get_actor(Principal.anonymous())
    const result = await actor.account_balance({ account: hexAccount }) as any

    console.log(result)

    assert.equal(result.e8s, 100_000_000_000n)
  })

  it('transfer ICP', async function () {
    const mintingPrincipal = Principal.fromText('3zjeh-xtbtx-mwebn-37a43-7nbck-qgquk-xtrny-42ujn-gzaxw-ncbzw-kqe')
    const targetPrincipal = Principal.fromText('o2ivq-5dsz3-nba5d-pwbk2-hdd3i-vybeq-qfz35-rqg27-lyesf-xghzc-3ae')
    const invokingPrincipal = Principal.fromText('7gaq2-4kttl-vtbt4-oo47w-igteo-cpk2k-57h3p-yioqe-wkawi-wz45g-jae')

    const mintingAccount = getAccount(mintingPrincipal, 0)
    const invokingAccount = getAccount(invokingPrincipal, 0)
    const targetAccount = getAccount(targetPrincipal, 0)

    const canister = await context.deploy('./cache/ledger.wasm', {
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
      }]
    })

    const actor = context.getAgent(invokingPrincipal).getActor(canister)
    const args = {
      amount: { e8s: 100_000 },
      memo: 0,
      fee: { e8s: 10_000 },
      from_subaccount: [],
      to: targetAccount.toUint8Array(),
      created_at_time: []
    }
    const result = await actor.transfer(args) as any

    console.log(result)

    assert.equal(result.Ok, 1n)
  })
})
