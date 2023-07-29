import debug from "debug"
import { CallSource, CallStatus, CallType, Message, RejectionCode } from "./call_context"
import { Principal } from "@dfinity/principal"
import { canisterIdIntoU64 } from "./utils"
import { CanisterState } from "./wasm_canister"

const log = debug('lightic:canister')
const ic0log = log.extend('ic0')


export class Ic0 {
    public getImports(state: CanisterState, importList: string[]) {
        const importObject = {}

        for (const item of importList) {
            if (this[item] !== undefined) {
                importObject[item] = (...args) => this[item](state, ...args)
            } else {
                importObject[item] = () => console.log("Call to ic0 not implemented function: "+item)
            }
        }

        return {ic0: importObject}
    }

    // Return length of args, called from canister
    msg_arg_data_size(cntx: CanisterState): number {
        ic0log('msg_arg_data_size: %o', cntx.args_buffer?.byteLength)
        return cntx.args_buffer?.byteLength ?? 0
    }

    // Copy args data to WASM memory, called from canister
    msg_arg_data_copy(cntx: CanisterState, dst: number, offset: number, size: number): void {
        const view = new Uint8Array(cntx.memory.buffer)
        ic0log('msg_arg_data_copy: %o %o %o', dst, offset, size)

        if (cntx.args_buffer !== null && cntx.args_buffer !== undefined) {
            for (let i = 0; i < size; i++) {
                const val = cntx.args_buffer[i]
                view[dst + i] = val
            }
        }
    }

    // Return length of args, called from canister
    msg_caller_size(cntx: CanisterState): number | undefined {
        return cntx.message?.sender?.toUint8Array().byteLength
    }

    // Copy args data to WASM memory, called from canister
    msg_caller_copy(cntx: CanisterState, dst: number, offset: number, size: number): void {
        const view = new Uint8Array(cntx.memory.buffer)

        if (cntx.message?.sender !== null && cntx.message?.sender !== undefined) {
            const buf = cntx.message.sender.toUint8Array()

            for (let i = 0; i < size; i++) {
                const val = buf[i]
                view[dst + i] = val
            }
        }
    }

    msg_reject_code(cntx: CanisterState): number {
        return cntx.message?.rejectionCode ?? 0
    }

    msg_reject_msg_size(cntx: CanisterState): number {
        return cntx.message?.rejectionMessage?.byteLength ?? 0
    }

    // Copy rejection msg data to WASM memory, called from canister
    msg_reject_msg_copy(cntx: CanisterState, dst: number, offset: number, size: number): void {
        if (cntx.message === undefined) return
        if (cntx.message.rejectionMessage === null) return

        const view = new Uint8Array(cntx.memory.buffer)

        if (cntx.message !== undefined && cntx.message.rejectionMessage !== undefined) {
            const buf = new Uint8Array(cntx.message.rejectionMessage)

            for (let i = 0; i < size; i++) {
                const val = buf[i]
                view[dst + i] = val
            }
        }
    }


    // Return length of args, called from canister
    canister_self_size(cntx: CanisterState): number {
        return cntx.canister.get_id().toUint8Array().byteLength
    }

    // Copy args data to WASM memory, called from canister
    canister_self_copy(cntx: CanisterState, dst: number, offset: number, size: number): void {
        const view = new Uint8Array(cntx.memory.buffer)

        const buf = cntx.canister.get_id().toUint8Array()

        for (let i = 0; i < size; i++) {
            const val = buf[i]
            view[dst + i] = val
        }
    }

    canister_cycle_balance(cntx: CanisterState): bigint {
        return cntx.cycles
    }

    // Called from canister, info about part of response
    msg_reply_data_append(cntx: CanisterState, src: number, size: number): void {
        const view = new Uint8Array(cntx.memory.buffer, src, size)

        cntx.reply_buffer.set(view, cntx.reply_size)
        cntx.reply_size += size
    }

    msg_reply(cntx: CanisterState): void {
        ic0log('msg_reply')

        if (cntx.message !== undefined) {
            if (cntx.message.status === CallStatus.Ok) {
                throw new Error('Message already replied')
            }

            ic0log(cntx.message.id + ' ' + cntx.message.method)
            cntx.message.status = CallStatus.Ok
            cntx.message.result = cntx.reply_buffer.subarray(0, cntx.reply_size)
        }
    }

    msg_reject(cntx: CanisterState, src: number, size: number): void {
        ic0log('msg_reject')

        if (cntx.message !== undefined) {
            // ic0log(cntx.message.id + ' ' + cntx.message.method)
            cntx.message.status = CallStatus.Error
            cntx.message.rejectionCode = RejectionCode.CanisterReject

            const view = new Uint8Array(cntx.memory.buffer, src, size)
            cntx.reply_buffer.set(view, 0)
            const msg = cntx.reply_buffer.subarray(0, size)

            cntx.message.rejectionMessage = msg
        }
    }

    msg_cycles_accept(cntx: CanisterState, maxAmount: bigint): bigint {
        if (cntx.message === undefined) return 0n

        let amount = maxAmount
        if (amount > cntx.message.cycles) {
            amount = cntx.message.cycles
        }

        cntx.message.cycles -= amount
        cntx.cycles += BigInt(amount)
        
        return amount
    }

    call_new(
        cntx: CanisterState,
        calleeSrc: number,
        calleeSize: number,
        nameSrc: number,
        nameSize: number,
        replyFun: number,
        replyEnv: number,
        rejectFun: number,
        rejectEnv: number): void {
        const msg = new Message({
            source: CallSource.InterCanister
        })

        msg.sender = Principal.fromText(cntx.canister.get_id().toString())

        const view = new Uint8Array(cntx.memory.buffer, calleeSrc, calleeSize)
        const target = Principal.fromUint8Array(view)

        msg.target = Principal.fromText(target.toString())

        const view2 = new Uint8Array(cntx.memory.buffer, nameSrc, nameSize)
        const name = new TextDecoder().decode(view2)

        msg.method = name

        if (cntx.message !== undefined) {
            msg.replyContext = cntx.message
        }
        msg.replyFun = replyFun
        msg.replyEnv = replyEnv
        msg.rejectFun = rejectFun
        msg.rejectEnv = rejectEnv

        cntx.newMessage = msg
        cntx.newMessageReplySize = 0

        ic0log('call_new: %o %o', target.toString(), name)
    }

    call_data_append(cntx: CanisterState, src: number, size: number): void {
        const view = new Uint8Array(cntx.memory.buffer, src, size)

        cntx.newMessageArgs.set(view, cntx.newMessageReplySize)
        cntx.newMessageReplySize += size
        ic0log('call_data_append: %o %o', src, size)
    }

    call_cycles_add(cntx: CanisterState, amount: bigint): void {
        if (cntx.newMessage !== undefined) {
            cntx.newMessage.cycles += amount
        }
    }

    call_cycles_add128(cntx: CanisterState, amountHigh: bigint, amountLow: bigint): void {
        if (amountHigh > 0n) throw new Error('Amount high is not implemented in call_cycles_add128!')
        if (cntx.newMessage !== undefined) {
            cntx.newMessage.cycles += amountLow
        }
    }

    call_perform(cntx: CanisterState): number {
        if (cntx.newMessage == null) return 1

        const args = cntx.newMessageArgs.subarray(0, cntx.newMessageReplySize)

        cntx.newMessage.args_raw = args


        if (cntx.message !== undefined) {
            cntx.message.relatedMessages.push(cntx.newMessage)
        }
        
        // Store inter canister message to be processed after cntx call is completed
        cntx.replica.store_message(cntx.newMessage)

        return 0
    }

    stable_size(cntx: CanisterState): number {
        return cntx.stableMemory.buffer.byteLength/65536 
    }

    stable_grow(cntx: CanisterState, newPages: number): number {
        return cntx.stableMemory.grow(newPages)
    }

    stable_write(cntx: CanisterState, offset: number, src: number, size: number): void {
        const stableView = new Uint8Array(cntx.stableMemory.buffer)
        const canisterView = new Uint8Array(cntx.memory.buffer, src, size)

        stableView.set(canisterView, offset)
    }

    stable_read(cntx: CanisterState, dst: number, offset: number, size: number): void {
        const stableView = new Uint8Array(cntx.stableMemory.buffer, offset, size)
        const canisterView = new Uint8Array(cntx.memory.buffer, dst, size)

        canisterView.set(stableView)
    }

    stable64_size(cntx: CanisterState): bigint {
        return BigInt(cntx.stableMemory.buffer.byteLength)/65536n 
    }

    certified_data_set(cntx: CanisterState, src: number, size: number): void {
        const view = new Uint8Array(cntx.memory.buffer, src, size)

        cntx.certified_data.set(view, 0)
        ic0log('certified_data_set: %o', cntx.certified_data)
    }

    // time(cntx: CanisterState): bigint {
    time(): bigint {
        const t = process.hrtime.bigint()
        ic0log('time: %o', t)
        return t
    }

    // global_timer_set(cntx: CanisterState, timestamp: bigint): bigint {
    global_timer_set(): bigint {
        return 0n
    }

    // performance_counter(cntx: CanisterState, counterType: number): bigint {
    performance_counter(): bigint {
        return 0n
    }

    debug_print(cntx: CanisterState, src: number, size: number): void {
        const data = cntx.memory.buffer.slice(src, src + size)
        const text = new TextDecoder().decode(data)

        log('Canister debug: %s', text)
    }

    trap(cntx: CanisterState, src: number, size: number): void {
        const data = cntx.memory.buffer.slice(src, src + size)
        const text = new TextDecoder().decode(data)

        log('Canister trap!: %s', text)

        // Revert canister memory to pre trap
        log('Reverting memory')
        const view = new Uint8Array(cntx.memory.buffer)
        view.set(new Uint8Array(cntx.memoryCopy))

        throw new Error('Canister trap!: ' + text)
    }

    mint_cycles(cntx: CanisterState, amount: bigint): bigint {
        const canId = canisterIdIntoU64(cntx.canister.get_id())

        if (canId !== 4n) {
            throw new Error('ic0.mint_cycles can only be executed on Cycles Minting Canister:')
        }

        cntx.cycles += amount

        return amount
    }
}