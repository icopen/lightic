import { fromHexString } from '@dfinity/candid'
import { assert } from 'chai'
import { Tree, makeHashTreeOld, mergeTrees } from '../src/hash_tree'
import { lookup_path } from '@dfinity/agent'
import cbor, { Tagged } from 'cbor'


describe('Hash Tree', function () {
    it('create', async function () {
        console.profile()
        const message = new Uint8Array(fromHexString('0ed555d9bfa07404c59b17116793348fdea037856fe57d835ba81b5ad16211fd'))
        const msgId = '1'

        const tree = new Tree()
        tree.insertValue(['request_status', msgId, 'status'], 'replied')
        tree.insertValue(['request_status', msgId, 'reply'], Buffer.from(message))

        const tree1 = makeHashTreeOld(['request_status', msgId, 'status'], 'replied')
        const tree2 = makeHashTreeOld(['request_status', msgId, 'reply'], Buffer.from(message))

        const tree3 = mergeTrees(tree1, tree2)
        const tree4 = tree.getHashTree()

        const encoded1 = cbor.encode(tree3)
        const encoded2 = cbor.encode(tree4)
        console.profileEnd()

    })

    it('get hash tree', async function () {
        const message = new Uint8Array(fromHexString('0ed555d9bfa07404c59b17116793348fdea037856fe57d835ba81b5ad16211fd'))
        const msgId = '1'

        const tree = new Tree()
        tree.insertValue(['request_status', msgId, 'status'], 'replied')
        tree.insertValue(['request_status', msgId, 'reply'], Buffer.from(message))
        tree.insertValue(['request_status', msgId, 'reply_message'], 'some example')

        const hashTree = tree.getHashTree();

        const value = lookup_path(['request_status', msgId, 'reply_message'], hashTree)
        assert.isTrue(value !== undefined)
    })
})
