import express from 'express'
import fs from 'fs'

// import cbor, { Tagged } from 'cbor'
import { ReplicaContext } from './replica_context';
import { CallSource, CallType, Message } from './call_context';
import { Principal } from '@dfinity/principal';
import { trace } from 'console';

const context = new ReplicaContext();

const app = express();
const port = 8001;

class Envelope {
    ic_api_version: string
    impl_source: string
    impl_version: string
    root_key: string

    constructor (source?: Partial<Envelope>) {
        Object.assign(this, source)
    }
}

// function run() {
//     let data = fs.readFileSync('status')

//     let decoded = cbor.decode(data)

//     let data2 = cbor.encode(decoded)

//     let root_key = new Uint8Array(133)
//     let status= {
//         impl_source: 'https://github.com/icopen/lightic',
//         ic_api_version: '0.18.0',
//         root_key: Buffer.from(root_key),
//         impl_version: '0.1.0',
//     }

//     let tagged = new Tagged(55799, status);

//     // let result = decode(data)

//     // let data2 = encode(result)
//     fs.writeFileSync('status_test', data2)
// }

// run()
app.use(express.raw())
app.use(express.json())

app.all('/api/v2/*', function(req, res, next){
    console.log(`[server]: URL Request: ${req.method} ${req.url}`)
    // console.log('General Validations');
    next();
});

interface CallContent {
    arg: Buffer,
    canister_id: Buffer,
    ingress_expiry: bigint,
    method_name: string,
    nonce: Buffer,
    request_type: string,
    sender: Buffer
}

interface CallRequest {
    content: CallContent
    sender_pubkey: Buffer,
    sender_sig: Buffer
}

app.post('/api/v2/canister/:canisterId/call', (req, res) => {
    var body: any[] = [];
    req.on('data', (chunk: any) => {
        body.push(chunk)
    }).on('end', () => {
        // let tag = cbor.decode(body[0] as Buffer)
        // let data = tag.value as CallRequest

        // let sender = Principal.from(data.sender_pubkey)


        // if (tag.tag !== 55799) {
        //     res.send({});
        // } else {
        //     let content = data.content
        //     let sender_pubkey = data.sender_pubkey
        //     let sender_sig = data.sender_sig

        //     if (content.request_type === 'call') {
        //         let msg = new Message({
        //             type: CallType.Update,
        //             sender: Principal.from(content.sender),
        //             source: CallSource.Ingress,
        //             args_raw: content.arg,
        //             method: content.method_name,
        //             target: Principal.from(content.canister_id)
        //         })
        //         debugger;
        //     } else {
        //         debugger;
        //     }

        //     debugger;

        //     res.send({});
        // }


    })

});

app.get('/api/v2/status', (req, res) => {
    let root_key = new Uint8Array(133)
    let status= {
        impl_source: 'https://github.com/icopen/lightic',
        ic_api_version: '0.18.0',
        root_key: Buffer.from(root_key),
        impl_version: '0.1.0',
    }

    let tagged = new Tagged(55799, status);

    let serializedAsBuffer = cbor.encode(tagged);
    fs.writeFileSync('status_test', serializedAsBuffer)

    res.send(serializedAsBuffer);
});

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});