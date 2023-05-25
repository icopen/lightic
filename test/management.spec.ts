import { Principal } from '@dfinity/principal'
import { TestContext } from '../src'
import { parse_candid_to_js } from '../src/wasm_tools/pkg/wasm_tools'
import fs from 'fs'

import { idlFactory } from '../src/mgmt.did'
import { IDL } from "@dfinity/candid"

const context = new TestContext()

describe('Management Canister', function () {
  it('raw_rand', async function () {
    const did = fs.readFileSync('./src/management_canister.did').toString()
    const ts = parse_candid_to_js(did)
    fs.writeFileSync('mgmt.did.js', ts)

    const result = await context.getAgent(Principal.anonymous()).getActor('aaaaa-aa').raw_rand()
    console.log(result)
  })

  it('provisional_create_canister_with_cycles', async function () {
    const idl = idlFactory({ IDL })

    const args = new Uint8Array([68, 73, 68, 76, 5, 108, 2, 227, 249, 245, 217, 8, 1, 216, 163, 140, 168, 13, 2, 108, 4, 192, 207, 242, 113, 2, 215, 224, 155, 144, 2, 3, 222, 235, 181, 169, 14, 2, 168, 130, 172, 198, 15, 2, 110, 125, 110, 4, 109, 104, 1, 0, 0, 0, 0, 0, 0])

    for (const field of idl._fields) {
      if (field[0] === 'provisional_create_canister_with_cycles') {
        const argTypes = field[1].argTypes
        // const retTypes = field[1].retTypes

        IDL.decode(argTypes, args)
      }
    }
  })
})

