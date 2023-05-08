import { blsVerify, fromHex } from '@dfinity/agent'
import { fromHexString } from '@dfinity/candid'
import { assert } from 'chai'
import { Bls } from '../src/bls'


describe('BLS 12 381', function () {
    it('sign message', async function () {
        console.profile()

        const bls = new Bls()
        await bls.init()

        const message = new Uint8Array(fromHexString('0ed555d9bfa07404c59b17116793348fdea037856fe57d835ba81b5ad16211fd'))

        const sign = await bls.sign(message)

        const verify = await blsVerify(bls.publicKey, new Uint8Array(sign), message)
        console.log("verified " + verify)
        assert.isTrue(verify)

        console.profileEnd()
    })
})
