import { IDL } from '@dfinity/candid'
import { Principal } from '@dfinity/principal'
import { buildIdl, type IdlResult } from './idl_builder'
import { CallSource, CallStatus, CallType, Message, RejectionCode } from './call_context'
import { type ReplicaContext } from './replica_context'
import { parse_candid } from './wasm_tools/pkg/wasm_tools'
import { CanisterStatus, Canister } from './canister'
import debug from 'debug'

const log = debug('lightic:canister')
const ic0log = log.extend('ic0')

/// Implementation of Imports used by canisters according to The Internet Computer Interface Specification
export class WasmCanister implements Canister {
  private readonly replica: ReplicaContext
  private module?: WebAssembly.Module
  private instance: WebAssembly.Instance

  private memory: WebAssembly.Memory

  private readonly cycles: number
  private readonly id: Principal
  private caller: Principal | null

  private candid: any
  private idl: IdlResult

  private readonly reply_buffer: Uint8Array
  private reply_size: number
  private memoryCopy: ArrayBuffer

  private args_buffer: ArrayBuffer | null

  private readonly certified_data: Uint8Array

  private readonly status: CanisterStatus

  private message: Message | null

  constructor(replica: ReplicaContext, id: Principal) {
    this.replica = replica
    this.id = id
    this.reply_buffer = new Uint8Array(102400)
    this.certified_data = new Uint8Array(32)
    this.reply_size = 0
    this.message = null
  }

  async install_module(code: WebAssembly.Module, initArgs: ArrayBuffer, sender: Principal) {
    this.module = code
    const importObject = this.getImports()

    if (this.module === undefined) return

    this.instance = await WebAssembly.instantiate(this.module, importObject)
    this.memory = this.instance.exports.memory as WebAssembly.Memory ?? this.instance.exports.mem as WebAssembly.Memory

    if (initArgs !== undefined && initArgs !== null && initArgs.byteLength > 0) {
      // Initialize canister
      const msg = Message.init(this.id, sender, initArgs)
      await this.process_message(msg)
    }
  }

  async install_module_candid(code: WebAssembly.Module, initArgs: any, sender: Principal, candidSpec?: string) {
    this.module = code

    const importObject = this.getImports()

    if (this.module === undefined) return

    this.instance = await WebAssembly.instantiate(this.module, importObject)
    this.memory = this.instance.exports.memory as WebAssembly.Memory ?? this.instance.exports.mem as WebAssembly.Memory

    if (candidSpec === undefined) {
      candidSpec = await this.get_candid()
    }

    const jsonCandid = parse_candid(candidSpec)
    const candid = JSON.parse(jsonCandid)
    this.candid = candid
    this.idl = buildIdl(IDL, candid)

    if (this.idl.init_args !== undefined && this.idl.init_args !== null && this.idl.init_args.length > 0) {
      const args = IDL.encode(this.idl.init_args, initArgs)

      // Initialize canister
      const msg = Message.init(this.id, sender, args)
      await this.process_message(msg)
    }
  }

  get_id(): Principal {
    return this.id
  }

  get_instance(): WebAssembly.Instance {
    return this.instance
  }

  getIdlBuilder(): IDL.InterfaceFactory {
    return (IDL) => buildIdl(IDL.IDL, this.candid).idl
  }

  private getImports(): any {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    const importObject = {
      ic0: {
        msg_arg_data_size: (...args) =>
          this.msg_arg_data_size.apply(self, args),
        msg_arg_data_copy: (...args) =>
          this.msg_arg_data_copy.apply(self, args),

        msg_caller_size: (...args) => this.msg_caller_size.apply(self, args),
        msg_caller_copy: (...args) => this.msg_caller_copy.apply(self, args),

        msg_reject_code: (...args) =>
          this.msg_reject_code.apply(self, args),
        msg_reject_msg_size: (...args) =>
          this.msg_reject_msg_size.apply(self, args),
        msg_reject_msg_copy: (...args) =>
          this.msg_reject_msg_copy.apply(self, args),

        msg_reply_data_append: (...args) =>
          this.msg_reply_data_append.apply(self, args),
        msg_reply: (...args) => this.msg_reply.apply(self, args),
        msg_reject: (...args) => this.msg_reject.apply(self, args),

        msg_cycles_available: (...args) =>
          this.not_implemented.apply(self, ['msg_cycles_available', ...args]),
        msg_cycles_available128: (...args) =>
          this.not_implemented.apply(self, [
            'msg_cycles_available128',
            ...args
          ]),
        msg_cycles_refunded: (...args) =>
          this.not_implemented.apply(self, ['msg_cycles_refunded', ...args]),
        msg_cycles_refunded128: (...args) =>
          this.not_implemented.apply(self, ['msg_cycles_refunded128', ...args]),
        msg_cycles_accept: (...args) =>
          this.not_implemented.apply(self, ['msg_cycles_accept', ...args]),
        msg_cycles_accept128: (...args) =>
          this.not_implemented.apply(self, ['msg_cycles_accept128', ...args]),

        canister_self_size: (...args) =>
          this.canister_self_size.apply(self, args),
        canister_self_copy: (...args) =>
          this.canister_self_copy.apply(self, args),
        canister_cycle_balance: (...args) =>
          this.not_implemented.apply(self, ['canister_cycle_balance', ...args]),
        canister_cycle_balance128: (...args) =>
          this.not_implemented.apply(self, [
            'canister_cycle_balance128',
            ...args
          ]),
        canister_status: (...args) =>
          this.not_implemented.apply(self, ['canister_status', ...args]),
        canister_version: (...args) =>
          this.not_implemented.apply(self, ['canister_version', ...args]),

        msg_method_name_size: (...args) =>
          this.not_implemented.apply(self, ['msg_method_name_size', ...args]),
        msg_method_name_copy: (...args) =>
          this.not_implemented.apply(self, ['msg_method_name_copy', ...args]),
        accept_message: (...args) =>
          this.not_implemented.apply(self, ['accept_message', ...args]),

        call_new: (...args) =>
          this.call_new.apply(self, args),
        call_on_cleanup: (...args) =>
          this.not_implemented.apply(self, ['call_on_cleanup', ...args]),
        call_data_append: (...args) =>
          this.call_data_append.apply(self, args),
        call_cycles_add: (...args) =>
          this.not_implemented.apply(self, ['call_cycles_add', ...args]),
        call_cycles_add128: (...args) =>
          this.not_implemented.apply(self, ['call_cycles_add128', ...args]),
        call_perform: (...args) =>
          this.call_perform.apply(self, args),

        stable_size: (...args) =>
          this.not_implemented.apply(self, ['stable_size', ...args]),
        stable_grow: (...args) =>
          this.not_implemented.apply(self, ['stable_grow', ...args]),
        stable_write: (...args) =>
          this.not_implemented.apply(self, ['stable_write', ...args]),
        stable_read: (...args) =>
          this.not_implemented.apply(self, ['stable_read', ...args]),
        stable64_size: (...args) =>
          this.stable64_size.apply(self, args),
        stable64_grow: (...args) =>
          this.not_implemented.apply(self, ['stable64_grow', ...args]),
        stable64_write: (...args) =>
          this.not_implemented.apply(self, ['stable64_write', ...args]),
        stable64_read: (...args) =>
          this.not_implemented.apply(self, ['stable64_read', ...args]),

        certified_data_set: (...args) =>
          this.certified_data_set.apply(self, args),
        data_certificate_present: (...args) =>
          this.not_implemented.apply(self, [
            'data_certificate_present',
            ...args
          ]),
        data_certificate_size: (...args) =>
          this.not_implemented.apply(self, ['data_certificate_size', ...args]),
        data_certificate_copy: (...args) =>
          this.not_implemented.apply(self, ['data_certificate_copy', ...args]),

        time: (...args) => this.time.apply(self, args),
        global_timer_set: (...args) =>
          this.global_timer_set.apply(self, ['global_timer_set', ...args]),
        performance_counter: (...args) =>
          this.performance_counter.apply(self, args),

        debug_print: (...args) => this.debug_print.apply(self, args),
        trap: (...args) => this.trap.apply(self, args),

        mint_cycles: (...args) => this.not_implemented.apply(self, ['mint_cycles', ...args]),
      }
    }

    return importObject
  }

  public async process_message(msg: Message): Promise<void> {
    msg.status = CallStatus.Processing

    if (msg.type === CallType.ReplyCallback) {
      const table = this.instance.exports.table as WebAssembly.Table

      const replyEnv = msg.replyEnv
      const fun = table.get(msg.replyFun)
      this.message = msg.replyContext

      this.args_buffer = msg.result
      this.reply_size = 0

      fun(replyEnv)
      msg.status = CallStatus.Ok
    } else if (msg.type === CallType.RejectCallback) {
      const table = this.instance.exports.table as WebAssembly.Table

      const replyEnv = msg.rejectEnv
      const fun = table.get(msg.rejectFun)
      this.message = msg.replyContext

      this.args_buffer = msg.result
      this.reply_size = 0

      fun(replyEnv)
      msg.status = CallStatus.Ok
    } else {
      const method = msg.getMethodName()
      const func = this.instance.exports[method] as any

      // Check if function was found in wasm, this should be 4 Canister Reject
      if (func === undefined) {
        msg.status = CallStatus.Error
        throw new Error('Function not found ' + method)
      }

      log(this.id.toString() + ': Calling ' + msg.method)

      this.message = msg

      this.args_buffer = msg.args_raw
      this.reply_size = 0

      this.caller = msg.sender

      // Copy canister memory, for possible restore on trap
      this.memoryCopy = new ArrayBuffer(this.memory.buffer.byteLength)
      new Uint8Array(this.memoryCopy).set(new Uint8Array(this.memory.buffer))

      try {
        func()
      } catch (e) {
        msg.status = CallStatus.Error
        log('Error on execution of {} {}', method, e)
        throw e
      }
    }

    // If call was an query, revert canister state
    if (msg.type === CallType.Query) {
      new Uint8Array(this.memory.buffer).set(new Uint8Array(this.memoryCopy))
    }

    this.caller = null
  }

  public async get_candid(): Promise<string> {
    // const candidArgs = WebAssembly.Module.customSections(this.module, 'icp:private candid:args')
    // const stable = WebAssembly.Module.customSections(this.module, 'icp:private motoko:stable-types')
    // const compiler = WebAssembly.Module.customSections(this.module, 'icp:private motoko:compiler')

    let candidHackRaw: string | undefined

    try {
      // log('Using candid hack if it exists')
      const msg = Message.candidHack(this.id)
      await this.process_message(msg)

      if (msg.result !== null) {
        const decoded = IDL.decode([IDL.Text], msg.result)
        candidHackRaw = decoded[0] as string

        log('Found candid via hack')
        return candidHackRaw
      }
    } catch (e) {
      log('Error when trying to get candid via hack')
    }

    if (this.module === undefined) {
      throw new Error('Cannot get candid for canister with no module installed')
    }

    const candidRaw = WebAssembly.Module.customSections(this.module, 'icp:public candid:service')
    if (candidRaw.length === 1) {
      log('Found candid via custom section')
      const candid = new TextDecoder().decode(candidRaw[0])

      return candid
    }

    throw new Error('Could not execute get candid hack')
  }

  public get_idl(): IDL.ConstructType {
    return this.idl.idl
  }

  public get_init_args(): IDL.ConstructType[] | undefined {
    return this.idl.init_args
  }

  // Return length of args, called from canister
  msg_arg_data_size(): number {
    ic0log('msg_arg_data_size: %o', this.args_buffer?.byteLength)
    return this.args_buffer?.byteLength ?? 0
  }

  // Copy args data to WASM memory, called from canister
  msg_arg_data_copy(dst: number, offset: number, size: number): void {
    const view = new Uint8Array(this.memory.buffer)
    ic0log('msg_arg_data_copy: %o %o %o', dst, offset, size)

    if (this.args_buffer !== null) {
      for (let i = 0; i < size; i++) {
        const val = this.args_buffer[i]
        view[dst + i] = val
      }
    }
  }

  // Return length of args, called from canister
  msg_caller_size(): number | undefined {
    return this.caller?.toUint8Array().byteLength
  }

  // Copy args data to WASM memory, called from canister
  msg_caller_copy(dst: number, offset: number, size: number): void {
    const view = new Uint8Array(this.memory.buffer)

    if (this.caller !== null) {
      const buf = this.caller.toUint8Array()

      for (let i = 0; i < size; i++) {
        const val = buf[i]
        view[dst + i] = val
      }
    }
  }

  msg_reject_code(): number {
    return this.message?.rejectionCode ?? 0
  }

  msg_reject_msg_size(): number {
    return this.message?.rejectionMessage?.byteLength ?? 0
  }

  // Copy rejection msg data to WASM memory, called from canister
  msg_reject_msg_copy(dst: number, offset: number, size: number): void {
    if (this.message === null) return
    if (this.message.rejectionMessage === null) return

    const view = new Uint8Array(this.memory.buffer)

    if (this.caller !== null) {
      const buf = new Uint8Array(this.message.rejectionMessage)

      for (let i = 0; i < size; i++) {
        const val = buf[i]
        view[dst + i] = val
      }
    }
  }


  // Return length of args, called from canister
  canister_self_size(): number {
    return this.id.toUint8Array().byteLength
  }

  // Copy args data to WASM memory, called from canister
  canister_self_copy(dst: number, offset: number, size: number): void {
    const view = new Uint8Array(this.memory.buffer)

    const buf = this.id.toUint8Array()

    for (let i = 0; i < size; i++) {
      const val = buf[i]
      view[dst + i] = val
    }
  }

  // Called from canister, info about part of response
  msg_reply_data_append(src: number, size: number): void {
    const view = new Uint8Array(this.memory.buffer, src, size)

    this.reply_buffer.set(view, this.reply_size)
    this.reply_size += size
  }

  msg_reply(): void {
    ic0log('msg_reply')

    if (this.message !== null) {
      ic0log(this.message.id + ' ' + this.message.method)
      this.message.status = CallStatus.Ok
      this.message.result = this.reply_buffer.subarray(0, this.reply_size)
    }
  }

  msg_reject(src: number, size: number): void {
    ic0log('msg_reject')

    if (this.message !== null) {
      // ic0log(this.message.id + ' ' + this.message.method)
      this.message.status = CallStatus.Error
      this.message.rejectionCode = RejectionCode.CanisterReject

      const view = new Uint8Array(this.memory.buffer, src, size)
      this.reply_buffer.set(view, size)
      const msg = this.reply_buffer.subarray(0, size)
    }
  }

  call_new(
    calleeSrc: number,
    calleeSize: number,
    nameSrc: number,
    nameSize: number,
    replyFun: number,
    replyEnv: number,
    rejectFun: number,
    rejectEnv: number): void {
    const msg = new Message({
      type: CallType.Update,
      source: CallSource.InterCanister
    })

    msg.sender = Principal.fromText(this.id.toString())

    const view = new Uint8Array(this.memory.buffer, calleeSrc, calleeSize)
    const target = Principal.fromUint8Array(view)

    msg.target = Principal.fromText(target.toString())

    const view2 = new Uint8Array(this.memory.buffer, nameSrc, nameSize)
    const name = new TextDecoder().decode(view2)

    msg.method = name

    if (this.message !== null) {
      msg.replyContext = this.message
    }
    msg.replyFun = replyFun
    msg.replyEnv = replyEnv
    msg.rejectFun = rejectFun
    msg.rejectEnv = rejectEnv

    this.reply_size = 0

    this.message = msg

    ic0log('call_new: %o %o', target.toString(), name)
  }

  call_data_append(src: number, size: number): void {
    const view = new Uint8Array(this.memory.buffer, src, size)

    this.reply_buffer.set(view, this.reply_size)
    this.reply_size += size
    ic0log('call_data_append: %o %o', src, size)
  }

  listAllProperties(o: object): any {
    let objectToInspect
    let result: string[] = []

    for (objectToInspect = o; objectToInspect !== null; objectToInspect = Object.getPrototypeOf(objectToInspect)) {
      result = result.concat(Object.getOwnPropertyNames(objectToInspect))
    }

    return result
  }

  call_perform(): number {
    if (this.message == null) return 1

    const args = this.reply_buffer.subarray(0, this.reply_size)

    this.message.args_raw = args

    // Store inter canister message to be processed after this call is completed
    this.replica.store_message(this.message)

    return 0
  }

  stable64_size(): bigint {
    return 0n
  }

  certified_data_set(src: number, size: number): void {
    const view = new Uint8Array(this.memory.buffer, src, size)

    this.certified_data.set(view, 0)
    ic0log('certified_data_set: %o', this.certified_data)
  }

  time(): bigint {
    const t = process.hrtime.bigint()
    ic0log('time: %o', t)
    return t
  }

  global_timer_set(timestamp: bigint): bigint {
    return 0n
  }

  performance_counter(counterType: number): bigint {
    return 0n
  }

  debug_print(src: number, size: number): void {
    const data = this.memory.buffer.slice(src, src + size)
    const text = new TextDecoder().decode(data)

    log('Canister debug: %s', text)
  }

  trap(src: number, size: number): void {
    const data = this.memory.buffer.slice(src, src + size)
    const text = new TextDecoder().decode(data)

    log('Canister trap!: %s', text)

    // Revert canister memory to pre trap
    log('Reverting memory')
    const view = new Uint8Array(this.memory.buffer)
    view.set(new Uint8Array(this.memoryCopy))

    throw new Error('Canister trap!: ' + text)
  }

  mint_cycles(amount: bigint): bigint {
    return amount
  }

  not_implemented(name, args): void {
    log('IC method not_implemented! %s', name)
  }
}
