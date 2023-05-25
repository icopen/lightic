import { fromHexString } from '@dfinity/candid'
import { assert } from 'chai'
import { Tree, makeHashTreeOld, mergeTrees } from '../src/hash_tree'
import { Bls } from '../src/bls'
import { getReadResponse } from '../src/server'

describe('Server Tests', function () {
    it('read_state', async function () {
        console.profile()
        const message = new Uint8Array(fromHexString('0ed555d9bfa07404c59b17116793348fdea037856fe57d835ba81b5ad16211fd'))
        const msgId = '12342342423432424234234234234234234323423342343242343243'


        const tree = new Tree();
        tree.insertValue(['request_status', msgId, 'reply'], Buffer.from(message))
        tree.insertValue(['request_status', msgId, 'status'], 'replied')
        const treeHash = tree.getHashTree()

        const tree1 = makeHashTreeOld(['request_status', msgId, 'reply'], Buffer.from(message))
        const tree2 = makeHashTreeOld(['request_status', msgId, 'status'], 'replied')
        const treeHash2 = mergeTrees(tree1, tree2)

        console.profileEnd()
    })
})
