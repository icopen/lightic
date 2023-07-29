import { Principal } from '@dfinity/principal'
import { assert } from 'chai'
import { LedgerHelper, TestContext, getAccount, hexToBytes } from '../src'
import { NNSHelper } from '../src/helpers/nns_helper'

const context = new TestContext()

describe('CMC', function () {
  afterEach(function () {
    // Clean LightIc
    context.clean()
  })

  it('install ledger canister', async function () {
    // const principal = Principal.fromText('dkzjk-sxlxb-cdh5x-rtexw-7y54l-yfwbq-rhayo-ufw34-lugle-j4s23-4ae')
    const mintingPrincipal = Principal.fromText('3zjeh-xtbtx-mwebn-37a43-7nbck-qgquk-xtrny-42ujn-gzaxw-ncbzw-kqe')
    const invokingPrincipal = Principal.fromText('7gaq2-4kttl-vtbt4-oo47w-igteo-cpk2k-57h3p-yioqe-wkawi-wz45g-jae')
    const targetPrincipal = Principal.fromText('o2ivq-5dsz3-nba5d-pwbk2-hdd3i-vybeq-qfz35-rqg27-lyesf-xghzc-3ae')

    const ledger = await LedgerHelper.defaults(context, mintingPrincipal, invokingPrincipal)

    const cmc = await NNSHelper.defaults(context, ledger.ledger.get_id(), invokingPrincipal)
    

  })

  // it('check account balance', async function () {
  //   const mintingPrincipal = Principal.fromText('3zjeh-xtbtx-mwebn-37a43-7nbck-qgquk-xtrny-42ujn-gzaxw-ncbzw-kqe')
  //   const targetPrincipal = Principal.fromText('o2ivq-5dsz3-nba5d-pwbk2-hdd3i-vybeq-qfz35-rqg27-lyesf-xghzc-3ae')
  //   const invokingPrincipal = Principal.fromText('7gaq2-4kttl-vtbt4-oo47w-igteo-cpk2k-57h3p-yioqe-wkawi-wz45g-jae')

  //   const mintingAccount = getAccount(mintingPrincipal, 0)
  //   const invokingAccount = getAccount(invokingPrincipal, 0)
  //   const targetAccount = getAccount(targetPrincipal, 0)

  //   const canister = await LedgerHelper.defaults(context, mintingPrincipal, invokingPrincipal)

  //   // const hexAccount = hexToBytes(invokingAccount)

  //   const actor = context.getAgent(Principal.anonymous()).getActor(canister.ledger)

  //   const result = await actor.account_balance({ account: invokingAccount.toUint8Array() }) as any

  //   console.log(result)

  //   assert.equal(result.e8s, 100_000_000_000n)
  // })

  // it('transfer ICP', async function () {
  //   const mintingPrincipal = Principal.fromText('3zjeh-xtbtx-mwebn-37a43-7nbck-qgquk-xtrny-42ujn-gzaxw-ncbzw-kqe')
  //   const targetPrincipal = Principal.fromText('o2ivq-5dsz3-nba5d-pwbk2-hdd3i-vybeq-qfz35-rqg27-lyesf-xghzc-3ae')
  //   const invokingPrincipal = Principal.fromText('7gaq2-4kttl-vtbt4-oo47w-igteo-cpk2k-57h3p-yioqe-wkawi-wz45g-jae')

  //   const mintingAccount = getAccount(mintingPrincipal, 0)
  //   const invokingAccount = getAccount(invokingPrincipal, 0)
  //   const targetAccount = getAccount(targetPrincipal, 0)

  //   const canister = await LedgerHelper.defaults(context, mintingPrincipal, invokingPrincipal)

  //   const actor = context.getAgent(invokingPrincipal).getActor(canister.ledger)
  //   const args = {
  //     amount: { e8s: 100_000 },
  //     memo: 0,
  //     fee: { e8s: 10_000 },
  //     from_subaccount: [],
  //     to: targetAccount.toUint8Array(),
  //     created_at_time: []
  //   }
  //   const result = await actor.transfer(args) as any

  //   console.log(result)

  //   assert.equal(result.Ok, 1n)
  // })
})
