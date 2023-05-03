import { fromHexString } from '@dfinity/candid'
import { assert } from 'chai'
import { Tree, makeHashTreeOld, mergeTrees } from '../src/hash_tree'
import { Bls } from '../src/bls'
import { getReadResponse } from '../src/server'

describe('Hash Tree', function () {
    it('read_state', async function () {
        const bls = new Bls()
        await bls.init()

        const message = new Uint8Array(fromHexString('0ed555d9bfa07404c59b17116793348fdea037856fe57d835ba81b5ad16211fd'))
        const msgId = '12342342423432424234234234234234234323423342343242343243'


        const tree = new Tree();
        tree.insertValue(['request_status', msgId, 'reply'], Buffer.from(message))
        tree.insertValue(['request_status', msgId, 'status'], 'replied')
        const treeHash = tree.getHashTree()

        const resp = await getReadResponse(bls, treeHash)


        const tree1 = makeHashTreeOld(['request_status', msgId, 'reply'], Buffer.from(message))
        const tree2 = makeHashTreeOld(['request_status', msgId, 'status'], 'replied')
        const treeHash2 = mergeTrees(tree1, tree2)

        const resp2 = await getReadResponse(bls, treeHash2)
    })
})
