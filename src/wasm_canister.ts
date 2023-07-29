import { IDL } from '@dfinity/candid'
import { Principal } from '@dfinity/principal'
import { buildIdl, type IdlResult } from './idl_builder'
import { CallSource, CallStatus, CallType, Message, RejectionCode } from './call_context'
import { type ReplicaContext } from './replica_context'
import { parse_candid } from './wasm_tools/pkg/wasm_tools'
import { Canister, WasmModule } from './canister'
import debug from 'debug'
import { Ic0 } from './ic0'
import { hexToBytes } from './utils'

const log = debug('lightic:canister')

export class CanisterState {
  replica: ReplicaContext
  canister: Canister

  memory: WebAssembly.Memory
  memoryCopy: ArrayBuffer
  cycles: bigint

  message?: Message

  args_buffer?: ArrayBuffer

  reply_buffer: Uint8Array
  reply_size: number

  newMessage?: Message
  newMessageArgs: Uint8Array
  newMessageReplySize: number
  certified_data: Uint8Array

  stableMemory: WebAssembly.Memory

  constructor(item: Partial<CanisterState>) {
    this.certified_data = new Uint8Array(32)

    this.reply_buffer = new Uint8Array(102400)
    this.reply_size = 0

    this.newMessageArgs = new Uint8Array(102400)
    this.newMessageReplySize = 0

    this.stableMemory = new WebAssembly.Memory({
      initial: 0
    })

    Object.assign(this, item)
  }
}


/// Implementation of Imports used by canisters according to The Internet Computer Interface Specification
export class WasmCanister implements Canister {
  private readonly id: Principal

  readonly created: bigint

  private module?: WasmModule

  private instance: WebAssembly.Instance

  private candid: any
  private idl: IdlResult

  private methods: Record<string, any>

  readonly state: CanisterState
  readonly ic0: Ic0

  constructor(replica: ReplicaContext, id: Principal) {
    this.id = id
    this.created = process.hrtime.bigint()

    this.ic0 = new Ic0()
    this.state = new CanisterState({
      canister: this,
      replica: replica,
      cycles: 1_000_000_000_000n
    })
    this.methods = {}
  }

  get_module_hash(): Buffer | undefined {
    return this.module !== undefined ?  Buffer.from(hexToBytes(this.module.hash)) : undefined
  }

  async install_module(code: WasmModule) {
    this.module = code

    const imports = WebAssembly.Module.imports(code.module)
    const importObject = this.ic0.getImports(this.state, imports.map(x => x.name))

    if (this.module === undefined) return

    this.instance = await WebAssembly.instantiate(this.module.module, importObject)
    this.state.memory = this.instance.exports.memory as WebAssembly.Memory ?? this.instance.exports.mem as WebAssembly.Memory

    for (const obj of Object.keys(this.instance.exports)) {
      if (obj.startsWith('canister_')) {
        const [type, name] = obj.split(' ')
        if (name === undefined) continue;
        this.methods[name] = {
          type: type,
          name: name,
          func: this.instance.exports[obj]
        }
      }
    }
  }

  async initialize(initArgs: ArrayBuffer, sender: Principal) {
    //todo: add warning if canister_init is exported, and there are no initArgs
    if (initArgs !== undefined && initArgs !== null && initArgs.byteLength > 0 && this.instance.exports['canister_init'] !== undefined) {
      // Initialize canister
      const msg = Message.init(this.id, sender, initArgs)
      await this.process_message(msg)
    }
  }

  async install_module_candid(module: WasmModule, initArgs: any, sender: Principal, candidSpec?: string) {
    // this.module = module

    // const imports = WebAssembly.Module.imports(module.module)
    // const importObject = this.ic0.getImports(this.state, imports.map(x => x.name))

    // if (this.module === undefined) return

    // this.instance = await WebAssembly.instantiate(this.module.module, importObject)
    // this.state.memory = this.instance.exports.memory as WebAssembly.Memory ?? this.instance.exports.mem as WebAssembly.Memory

    await this.install_module(module);

    if (candidSpec === undefined) {
      candidSpec = await this.get_candid()
    }

    const jsonCandid = parse_candid(candidSpec)
    const candid = JSON.parse(jsonCandid)
    this.candid = candid
    this.idl = buildIdl(IDL, candid)

    if (this.idl.init_args !== undefined && this.idl.init_args !== null && this.idl.init_args.length > 0) {
      initArgs = IDL.encode(this.idl.init_args, initArgs)
    }

    this.initialize(initArgs, sender)
    // if (this.idl.init_args !== undefined && this.idl.init_args !== null && this.idl.init_args.length > 0 && this.instance.exports['canister_init'] !== undefined) {
    //   const args = IDL.encode(this.idl.init_args, initArgs)

    //   // Initialize canister
    //   const msg = Message.init(this.id, sender, args)
    //   await this.process_message(msg)
    // }
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

  public async process_message(msg: Message): Promise<void> {
    msg.status = CallStatus.Processing

    if (msg.type === CallType.ReplyCallback) {
      const table = this.instance.exports.table as WebAssembly.Table

      const replyEnv = msg.replyEnv
      const fun = table.get(msg.replyFun)
      this.state.message = msg.replyContext

      this.state.args_buffer = msg.result
      this.state.reply_size = 0
      try {
        fun(replyEnv)
        msg.status = CallStatus.Ok
      } catch (e) {
        msg.status = CallStatus.Error
        msg.rejectionCode = RejectionCode.CanisterError
        msg.rejectionMessage = new TextEncoder().encode(e.message)

        msg.replyContext.status = CallStatus.Error
        msg.replyContext.rejectionCode = RejectionCode.CanisterError
        msg.replyContext.rejectionMessage = new TextEncoder().encode("ReplyCallback: "+e.message)

        log('Error on ReplyCallback of {}', e)
      }
    } else if (msg.type === CallType.RejectCallback) {
      const table = this.instance.exports.table as WebAssembly.Table

      const replyEnv = msg.rejectEnv
      const fun = table.get(msg.rejectFun)
      this.state.message = msg.replyContext

      this.state.args_buffer = msg.result
      this.state.reply_size = 0
      try {
        fun(replyEnv)
        msg.status = CallStatus.Ok
      } catch (e) {
        msg.status = CallStatus.Error
        msg.rejectionCode = RejectionCode.CanisterError
        msg.rejectionMessage = new TextEncoder().encode(e.message)

        msg.replyContext.status = CallStatus.Error
        msg.replyContext.rejectionCode = RejectionCode.CanisterError
        msg.replyContext.rejectionMessage = new TextEncoder().encode("RejectCallback: "+e.message)

        log('Error on RejectCallback of {}', e)
      }
    } else {
      const method = msg.getMethodName()
      let func = this.instance.exports[method] as any

      if (msg.source === CallSource.InterCanister) {
        if (func === undefined) {
          func = this.methods[method]?.func;
        }
      }

      // Check if function was found in wasm, this should be 4 Canister Reject
      if (func === undefined) {
        msg.status = CallStatus.Error
        msg.rejectionCode = RejectionCode.DestinationInvalid
        msg.rejectionMessage = new TextEncoder().encode('Function not found ' + method)

        throw new Error('Function not found ' + method)
      }

      log(this.id.toString() + ': Calling ' + msg.method)

      this.state.message = msg

      this.state.args_buffer = msg.args_raw
      this.state.reply_size = 0

      // Copy canister memory, for possible restore on trap
      this.state.memoryCopy = new ArrayBuffer(this.state.memory.buffer.byteLength)
      new Uint8Array(this.state.memoryCopy).set(new Uint8Array(this.state.memory.buffer))

      try {
        func()

        if (msg.type === CallType.Init) {
          msg.status = CallStatus.Ok
        }

      } catch (e) {
        msg.status = CallStatus.Error
        msg.rejectionCode = RejectionCode.CanisterError
        msg.rejectionMessage = new TextEncoder().encode(e.message)

        log('Error on execution of {} {}', method, e)
        throw e
      }
    }

    // If call was an query, revert canister state
    if (msg.type === CallType.Query || msg.status === CallStatus.Error) {
      new Uint8Array(this.state.memory.buffer).set(new Uint8Array(this.state.memoryCopy))
    }

    //This is a problem only if there are no related messages, otherwise this is fine
    if (msg.status === CallStatus.Processing && msg.relatedMessages.length === 0) {
      msg.status = CallStatus.Error
      msg.rejectionCode = RejectionCode.CanisterError
      msg.rejectionMessage = new TextEncoder().encode('Invalid processing, no response')
    }
  }

  public async get_candid(): Promise<string> {
    let candidHackRaw: string | undefined

    try {
      const msg = Message.candidHack(this.id)
      await this.process_message(msg)

      if (msg.result !== null && msg.result !== undefined) {
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

}
