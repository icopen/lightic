import { assert } from 'chai'
import { TestContext } from '../src'

const context = new TestContext()

describe('Instrumentation', function () {
  afterEach(function () {
    // Clean LightIc
    context.clean()
  })

  it('export func table', async function () {
    const canister = await context.deploy('./spec_test/target/wasm32-unknown-unknown/release/spec_test.wasm')

    assert.exists(canister.get_instance().exports.table)
  })
})
