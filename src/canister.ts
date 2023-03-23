import { IDL } from "@dfinity/candid";
import { Principal } from "@dfinity/principal";
import { parse_candid } from "../candid_util/pkg/candid_util";
import { build_idl } from "./idl_builder";
import { Actor, ActorSubclass } from "./mock_actor";

export enum CanisterStatus {
    Running,
    Stopping,
    Stopped
}

/// Implementation of Imports used by canisters according to The Internet Computer Interface Specification
export class Canister {
    private module: WebAssembly.Module;
    private instance: WebAssembly.Instance;

    private memory: WebAssembly.Memory;

    private cycles: number;
    private id: Principal;
    private caller: Principal;

    private idl: IDL.ConstructType<any>;

    private reply_buffer: Uint8Array;
    private reply_size: number;

    private args_buffer: ArrayBuffer;

    private status: CanisterStatus;

    constructor(id: Principal, module: WebAssembly.Module) {
        this.id = id;
        this.module = module;
        this.reply_buffer = new Uint8Array(102400);
        this.reply_size = 0;
    }

    get_actor(caller: Principal) {
        return Actor.createActor(this, caller);
    }

    get_id(): Principal {
        return this.id;
    }

    async init(candid_spec: string) {
        let self = this;

        let importObject = {
            ic0: {
                msg_arg_data_size: (...args) => this.msg_arg_data_size.apply(self, args),
                msg_arg_data_copy: (...args) => this.msg_arg_data_copy.apply(self, args),

                msg_caller_size: (...args) => this.msg_caller_size.apply(self, args),
                msg_caller_copy: (...args) => this.msg_caller_copy.apply(self, args),

                msg_reject_code: (...args) => this.not_implemented.apply(self, ['msg_reject_code', ...args]),
                msg_reject_msg_size: (...args) => this.not_implemented.apply(self, ['msg_reject_msg_size', ...args]),
                msg_reject_msg_copy: (...args) => this.not_implemented.apply(self, ['msg_reject_msg_copy', ...args]),

                msg_reply_data_append: (...args) => this.msg_reply_data_append.apply(self, args),
                msg_reply: (...args) => this.msg_reply.apply(self, args),
                msg_reject: (...args) => this.not_implemented.apply(self, ['msg_reject', ...args]),

                msg_cycles_available: (...args) => this.not_implemented.apply(self, ['msg_cycles_available', ...args]),
                msg_cycles_available128: (...args) => this.not_implemented.apply(self, ['msg_cycles_available128', ...args]),
                msg_cycles_refunded: (...args) => this.not_implemented.apply(self, ['msg_cycles_refunded', ...args]),
                msg_cycles_refunded128: (...args) => this.not_implemented.apply(self, ['msg_cycles_refunded128', ...args]),
                msg_cycles_accept: (...args) => this.not_implemented.apply(self, ['msg_cycles_accept', ...args]),
                msg_cycles_accept128: (...args) => this.not_implemented.apply(self, ['msg_cycles_accept128', ...args]),

                canister_self_size: (...args) => this.canister_self_size.apply(self, args),
                canister_self_copy: (...args) => this.canister_self_copy.apply(self, args),
                canister_cycle_balance: (...args) => this.not_implemented.apply(self, ['canister_cycle_balance', ...args]),
                canister_cycle_balance128: (...args) => this.not_implemented.apply(self, ['canister_cycle_balance128', ...args]),
                canister_status: (...args) => this.not_implemented.apply(self, ['canister_status', ...args]),
                canister_version: (...args) => this.not_implemented.apply(self, ['canister_version', ...args]),

                msg_method_name_size: (...args) => this.not_implemented.apply(self, ['msg_method_name_size', ...args]),
                msg_method_name_copy: (...args) => this.not_implemented.apply(self, ['msg_method_name_copy', ...args]),
                accept_message: (...args) => this.not_implemented.apply(self, ['accept_message', ...args]),

                call_new: (...args) => this.not_implemented.apply(self, ['call_new', ...args]),
                call_on_cleanup: (...args) => this.not_implemented.apply(self, ['call_on_cleanup', ...args]),
                call_data_append: (...args) => this.not_implemented.apply(self, ['call_data_append', ...args]),
                call_cycles_add: (...args) => this.not_implemented.apply(self, ['call_cycles_add', ...args]),
                call_cycles_add128: (...args) => this.not_implemented.apply(self, ['call_cycles_add128', ...args]),
                call_perform: (...args) => this.not_implemented.apply(self, ['call_perform', ...args]),

                stable_size: (...args) => this.not_implemented.apply(self, ['stable_size', ...args]),
                stable_grow: (...args) => this.not_implemented.apply(self, ['stable_grow', ...args]),
                stable_write: (...args) => this.not_implemented.apply(self, ['stable_write', ...args]),
                stable_read: (...args) => this.not_implemented.apply(self, ['stable_read', ...args]),
                stable64_size: (...args) => this.not_implemented.apply(self, ['stable64_size', ...args]),
                stable64_grow: (...args) => this.not_implemented.apply(self, ['stable64_grow', ...args]),
                stable64_write: (...args) => this.not_implemented.apply(self, ['stable64_write', ...args]),
                stable64_read: (...args) => this.not_implemented.apply(self, ['stable64_read', ...args]),

                certified_data_set: (...args) => this.not_implemented.apply(self, ['certified_data_set', ...args]),
                data_certificate_present: (...args) => this.not_implemented.apply(self, ['data_certificate_present', ...args]),
                data_certificate_size: (...args) => this.not_implemented.apply(self, ['data_certificate_size', ...args]),
                data_certificate_copy: (...args) => this.not_implemented.apply(self, ['data_certificate_copy', ...args]),

                time: (...args) => this.not_implemented.apply(self, ['time', ...args]),
                global_timer_set: (...args) => this.not_implemented.apply(self, ['global_timer_set', ...args]),
                performance_counter: (...args) => this.not_implemented.apply(self, ['performance_counter', ...args]),

                debug_print: (...args) => this.debug_print.apply(self, args),
                trap: (...args) => this.trap.apply(self, args),
            }
        }

        this.instance = await WebAssembly.instantiate(this.module, importObject);
        this.memory = this.instance.exports.memory as WebAssembly.Memory;

        if (candid_spec === null) {
            candid_spec = this.get_candid();
        }

        let json_candid = parse_candid(candid_spec);
        let candid = JSON.parse(json_candid);
        this.idl = build_idl(candid);
    }

    public query_call(name: string, caller: Principal, args: ArrayBuffer): ArrayBuffer {
        name = "canister_query " + name;
        //todo: setup caller for the canister
        return this.call(name, caller, args);
    }

    public update_call(name: string, caller: Principal, args: ArrayBuffer): ArrayBuffer {
        name = "canister_update " + name;
        //todo: setup caller for the canister
        return this.call(name, caller, args);
    }

    public call(name: string, caller: Principal, args: ArrayBuffer): ArrayBuffer {

        let func = this.instance.exports[name] as any;

        //Check if function was found in wasm
        if (func === undefined) throw { message: "Function not found " + name };

        //Reset buffers before calling function
        this.args_buffer = args;
        this.reply_size = 0;

        this.caller = caller;

        //Invoke function
        let res = func();

        this.caller = null;

        //We should now have response!, trim down reply buffer to reply_size
        return this.reply_buffer.subarray(0, this.reply_size);
    }

    public get_candid(): string {
        let args = IDL.encode([], []);
        let reply = this.call('canister_query __get_candid_interface_tmp_hack', Principal.anonymous(), args);
        let decoded = IDL.decode([IDL.Text], reply);

        return decoded[0] as string;
    }

    public get_idl() {
        return this.idl;
    }


    //Return length of args, called from canister
    msg_arg_data_size(): number {
        return this.args_buffer.byteLength;
    }

    //Copy args data to WASM memory, called from canister
    msg_arg_data_copy(
        dst: number,
        offset: number,
        size: number
    ) {
        let view = new Uint8Array(this.memory.buffer);

        for (let i = 0; i < size; i++) {
            let val = this.args_buffer[i];
            view[dst + i] = val;
        }
    }

    //Return length of args, called from canister
    msg_caller_size(): number {
        return this.caller.toUint8Array().byteLength;
    }

    //Copy args data to WASM memory, called from canister
    msg_caller_copy(
        dst: number,
        offset: number,
        size: number
    ) {
        let view = new Uint8Array(this.memory.buffer);

        let buf = this.caller.toUint8Array();

        for (let i = 0; i < size; i++) {
            let val = buf[i];
            view[dst + i] = val;
        }
    }

    //Return length of args, called from canister
    canister_self_size(): number {
        return this.id.toUint8Array().byteLength;
    }

    //Copy args data to WASM memory, called from canister
    canister_self_copy(
        dst: number,
        offset: number,
        size: number
    ) {
        let view = new Uint8Array(this.memory.buffer);

        let buf = this.id.toUint8Array();

        for (let i = 0; i < size; i++) {
            let val = buf[i];
            view[dst + i] = val;
        }
    }




    //Called from canister, info about part of response
    msg_reply_data_append(
        src: number,
        size: number,
    ) {
        let view = new Uint8Array(this.memory.buffer, src, size);

        this.reply_buffer.set(view, this.reply_size);
        this.reply_size += size;
    }

    msg_reply(test: any) {
        // let decoded = IDL.decode([IDL.Text], reply_buffer.subarray(0, reply_size));
        // response = decoded;

        //reply has finished! :D
    }


    debug_print(
        src: number, size: number
    ) {
        let data = this.memory.buffer.slice(src, src + size);
        let text = new TextDecoder().decode(data);

        console.log("Canister debug: " + text);
    }

    trap(
        src: number, size: number
    ) {
        let data = this.memory.buffer.slice(src, src + size);
        let text = new TextDecoder().decode(data);

        console.log("Canister trap!: " + text);

        //todo: add trap handling!
    }

    not_implemented(
        name,
        args
    ) {
        console.log("IC method not_implemented! ", name);
    }
}