import express from 'express'
import fs from 'fs'

import cbor, { Tagged } from 'cbor'
import { ReplicaContext } from './replica_context';
import { CallSource, CallStatus, CallType, Message } from './call_context';
import { Principal } from '@dfinity/principal';
import { ReadStateResponse, requestIdOf, toHex, concat, HashTree, reconstruct } from '@dfinity/agent';

import { Tree, makeHashTreeOld, mergeTrees } from './hash_tree';

import { Bls } from './bls';

const bls = new Bls()

const context = new ReplicaContext();

const app = express();
const port = 8001;

interface CallContent {
    request_type: string,
    sender: Buffer
    nonce: Buffer,
    ingress_expiry: bigint,
    canister_id: Buffer,
    method_name: string,
    arg: Buffer,
}

interface ReadStateContent {
    request_type: string,
    ingress_expiry: bigint,
    paths: any[]
    sender: Buffer
}

interface QueryContent {
    request_type: string,
    arg: Buffer,
    canister_id: Buffer,
    ingress_expiry: bigint,
    method_name: string,
    sender: Buffer
}

interface CallRequest<T> {
    content: T
    sender_pubkey: Buffer,
    sender_sig: Buffer
}

app.use(express.raw())
app.use(express.json())

app.all('/api/v2/*', function (req, res, next) {
    console.log(`[server]: URL Request: ${req.method} ${req.url}`)
    // console.log('General Validations');
    next();
});

app.post('/api/v2/canister/:canisterId/query', (req, res) => {
    const body: any[] = [];
    req.on('data', (chunk: any) => {
        body.push(chunk)
    }).on('end', async () => {

        const tag = cbor.decode(body[0] as Buffer)
        const data = tag.value as CallRequest<QueryContent>
        const content = data.content

        const sender = Principal.fromUint8Array(content.sender)
        const canister_id = Principal.fromUint8Array(content.canister_id)
        const reqId = toHex(requestIdOf(data.content))

        if (content.request_type === 'query') {
            const msg = new Message({
                id: reqId,
                type: CallType.Query,
                source: CallSource.Ingress,
                args_raw: content.arg,
                method: content.method_name,

                target: Principal.fromText(canister_id.toString()),
                sender: Principal.fromText(sender.toString()),
            })
            context.store_message(msg);
            try {
                await context.process_messages();

                res.status(202)
                res.send()
            } catch (e) {
                console.log("Error: " + e)
                res.send({})
            }

        } else {
            res.send({})
        }
    })
});

app.post('/api/v2/canister/:canisterId/call', (req, res) => {
    const canisterId = req.params.canisterId
    const canister = context.get_canister(Principal.from(canisterId))


    const body: Buffer[] = [];
    req.on('data', (chunk: any) => {
        body.push(chunk)
    }).on('end', async () => {
        // fs.writeFileSync('request', body[0])

        const bodySize = body.map(x => x.byteLength).reduce((x, y) => x + y)
        const rawData = new Uint8Array(bodySize)

        let pos = 0
        for (const item of body) {
            rawData.set(item, pos)
            pos += item.byteLength
        }

        const tag = cbor.decode(rawData)
        const data = tag.value as CallRequest<CallContent>

        if (tag.tag !== 55799) {
            res.send({});
        } else {
            const content = data.content
            const sender_pubkey = data.sender_pubkey
            const sender_sig = data.sender_sig

            const sender = Principal.fromUint8Array(content.sender)
            const canister_id = Principal.fromUint8Array(content.canister_id)

            if (canister === undefined && !(canister_id.toString() === 'aaaaa-aa' && content.method_name === 'provisional_create_canister_with_cycles')) {
                res.status(404)
                res.send('Canister not found: ' + canisterId)
            } else {
                const reqId = toHex(requestIdOf(data.content))

                if (content.request_type === 'call') {
                    const msg = new Message({
                        id: reqId,
                        type: CallType.Update,
                        sender: Principal.fromText(sender.toString()),
                        source: CallSource.Ingress,
                        args_raw: content.arg,
                        method: content.method_name,
                        target: Principal.fromText(canister_id.toString())
                    })

                    context.store_message(msg);
                    try {
                        await context.process_messages();

                        res.status(202)
                    } catch (e) {
                        console.log("Error: " + e)
                        // res.send({})
                    }
                    res.send()
                } else {
                    res.send({})
                }
            }
        }


    })

});

export async function getReadResponse(bls: Bls, hashTree: HashTree): Promise<Buffer> {
    const rootHash = await reconstruct(hashTree)

    const msg2 = concat(bls.domain_sep('ic-state-root'), rootHash);
    const sig = await bls.sign(msg2)

    const cert = {
        tree: hashTree,
        signature: Buffer.from(sig)
    }
    const certTagged = new Tagged(55799, cert);
    const certEncoded = cbor.encode(certTagged);

    const resp: ReadStateResponse = {
        certificate: certEncoded
    }

    const tagged = new Tagged(55799, resp);
    const serializedAsBuffer = cbor.encode(tagged);
    return serializedAsBuffer
}

app.post('/api/v2/canister/:canisterId/read_state', (req, res) => {
    const body: any[] = [];
    req.on('data', (chunk: any) => {
        body.push(chunk)
    }).on('end', async () => {

        const tag = cbor.decode(body[0] as Buffer)
        const data = tag.value as CallRequest<ReadStateContent>

        const paths = data.content.paths

        for (const path of paths) {
            const start = new TextDecoder().decode(path[0])

            if (start === 'request_status') {
                const msgId = path[1]
                const msgIdStr = toHex(msgId)

                const msg = context.get_message(msgIdStr)
                if (msg !== undefined && msg.result !== null) {
                    if (msg.status === CallStatus.Ok) {
                        const tree = new Tree();
                        tree.insertValue(['request_status', msgId, 'reply'], Buffer.from(msg.result))
                        tree.insertValue(['request_status', msgId, 'status'], 'replied')
                        const treeHash = tree.getHashTree()

                        const resp = await getReadResponse(bls, treeHash)

                        res.send(resp)
                    } else if (msg.status === CallStatus.Error) {
                        const tree = new Tree();
                        tree.insertValue(['request_status', msgId, 'reject_code'], msg.rejectionCode)
                        if (msg.rejectionMessage !== null && msg.rejectionMessage !== undefined) {
                            tree.insertValue(['request_status', msgId, 'reject_message'], Buffer.from(msg.rejectionMessage))
                        }
                        tree.insertValue(['request_status', msgId, 'status'], 'rejected')
                        const treeHash = tree.getHashTree()

                        const resp = await getReadResponse(bls, treeHash)

                        res.send(resp)
                    } else {
                        console.log("Unsupported request for status for message with status: " + msg.status)
                        res.send({})
                    }
                }
            }
        }
    })
});

app.get('/api/v2/status', (req, res) => {
    // let root_key = new Uint8Array(133)
    const status = {
        impl_source: 'https://github.com/icopen/lightic',
        ic_api_version: '0.18.0',
        root_key: bls.derPublicKey,
        impl_version: '0.1.0',
    }

    const tagged = new Tagged(55799, status);

    const serializedAsBuffer = cbor.encode(tagged);
    fs.writeFileSync('status_test', serializedAsBuffer)

    res.send(serializedAsBuffer);
});



async function run() {
    await bls.init()

    app.listen(port, () => {
        console.log(`[server]: Server is running at http://localhost:${port}`);
    });
}

run()