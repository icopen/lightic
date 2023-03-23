import { Principal } from '@dfinity/principal';
import fs from 'fs';

import { ReplicaContext } from './replica_context';



async function run() {
    const wasmBuffer = fs.readFileSync('./spec_test/target/wasm32-unknown-unknown/release/spec_test.wasm');
    let compiled = await WebAssembly.compile(wasmBuffer);

    let local_prin = Principal.anonymous();

    let context = new ReplicaContext();
    let canister = await context.install_canister(compiled, null);
    let actor = canister.get_actor(local_prin);

    try {
        console.log("Canister id: ", canister.get_id().toString());
        let result = await actor.test_id();
        console.log(result[0].toString());

        console.log("Caller id: ", local_prin.toString());
        let result2 = await actor.test_caller();
        console.log(result2[0].toString());

    } catch (e) {
        debugger;
        console.error(e);
    }
}

run();