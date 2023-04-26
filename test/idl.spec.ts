import { IDL } from '@dfinity/candid'

import fs from 'fs'
import { TestContext } from '../src'
import { buildIdl } from '../src/idl_builder'
import { parse_candid } from '../src/wasm_tools/pkg/wasm_tools'

describe('IDL Build', function () {
  it('from motoko', async function () {
    const candidSpec = fs.readFileSync('./test/motoko.did').toString()
    const jsonCandid = parse_candid(candidSpec)
    const candid = JSON.parse(jsonCandid)
    buildIdl(IDL, candid)
  })

  it('candid from motoko build', async function () {
    const context = new TestContext()
    await context.deploy('./cache/staging.wasm')
  })
})
