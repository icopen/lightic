import { Principal } from "@dfinity/principal";
import { Canister } from "./canister";
import { u64_into_canister_id } from "./utils";

export class ReplicaContext {
    private last_id: bigint

    private canisters: Record<string, Canister>;

    constructor() {
        this.canisters = {};

        this.last_id = 0n;
    }

    get_canister_id(): Principal {
        let id = u64_into_canister_id(this.last_id + 1n);
        this.last_id += 1n;
        return id
    }

    async install_canister(code: WebAssembly.Module, candid: string): Promise<Canister> {
        let id = this.get_canister_id();

        let canister = new Canister(id, code);
        await canister.init(candid);

        this.canisters[id.toString()] = canister;

        return canister;
    }

    get_canister(id: Principal): Canister {
        return this.canisters[id.toString()];
    }
}