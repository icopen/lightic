import { Principal } from '@dfinity/principal'
import { WasmCanister } from './wasm_canister'

import debug from 'debug'
import { CallSource, CallStatus, CallType, Message, RejectionCode } from './call_context'
import { u64IntoCanisterId } from './utils'
import { ManagementCanister } from './management_canister'
import { Canister } from './canister'
const log = debug('lightic:replica')

export interface InstallCanisterArgs {
  initArgs?: any,
  candid?: string,
  id?: string,
  caller?: Principal
}

export class ReplicaContext {
  private last_id: bigint
  private canisters: Record<string, Canister>
  // private msg_log: Message[]

  private messages: Record<string, Message>

  //Maximum number of canister before force dealocation
  private maxCanisterNumber: number
  //How many canisters at once should be freed
  private freeCanisters: number

  constructor() {
    this.canisters = {}
    this.last_id = 0n
    this.messages = {}

    this.canisters['aaaaa-aa'] = new ManagementCanister(this)

    this.maxCanisterNumber = 90
    this.freeCanisters = 30

    // this.msg_log = []
  }

  // Processes messages
  // Todo: add correct replica errors
  private async process_message(msg: Message): Promise<ArrayBuffer | null> {
    const canister = this.canisters[msg.target.toString()]

    if (canister !== undefined) {
      await canister.process_message(msg)

      // Process any waiting messages, before returning, ie all inter-canister calls
      await this.process_messages()
    } else {
      msg.status = CallStatus.Error
      msg.rejectionCode = RejectionCode.DestinationInvalid
      msg.rejectionMessage = new TextEncoder().encode("Canister not found: " + msg.target.toString())
    }

    return msg.result
  }

  // Store message for processing
  store_message(msg: Message): void {
    // const canister = this.canisters[msg.target.toString()]

    // if (canister === undefined) {
    //   throw new Error('Canister not found! ' + msg.target.toString())
    // }

    if (msg.id === undefined) {
      msg.id = (Object.keys(this.messages).length + 1).toString()
    }

    this.messages[msg.id] = msg
  }

  // Process all waiting messages
  async process_messages(): Promise<void> {
    while (Object.values(this.messages).some((x) => x.status === CallStatus.New)) {
      // Take first message from list for processing
      const msg = Object.values(this.messages).filter((x) => x.status === CallStatus.New)[0]
      await this.process_message(msg)

      if (msg.source === CallSource.InterCanister && msg.type === CallType.Update) {
        if (msg.status === CallStatus.Ok) {
          const reply: Message = new Message({
            source: CallSource.InterCanister,
            type: CallType.ReplyCallback,

            target: Principal.fromText(msg.sender.toString()),
            sender: Principal.fromText(msg.target.toString()),

            result: msg.result,
            args_raw: msg.result,
            replyFun: msg.replyFun,
            replyEnv: msg.replyEnv,
            rejectFun: msg.rejectFun,
            rejectEnv: msg.rejectEnv,
            replyContext: msg.replyContext
          })
          this.store_message(reply)
        }
        if (msg.status === CallStatus.Error) {
          const reply: Message = new Message({
            source: CallSource.InterCanister,
            type: CallType.RejectCallback,
            rejectionCode: msg.rejectionCode,

            target: Principal.fromText(msg.sender.toString()),
            sender: Principal.fromText(msg.target.toString()),

            result: msg.result,
            args_raw: msg.result,
            replyFun: msg.replyFun,
            replyEnv: msg.replyEnv,
            rejectFun: msg.rejectFun,
            rejectEnv: msg.rejectEnv,
            replyContext: msg.replyContext
          })
          this.store_message(reply)
        }
      }
    }
  }

  get_message(id: string): Message | undefined {
    return this.messages[id]
  }

  get_canisters(): Canister[] {
    return Object.values(this.canisters)
  }

  get_canister_id(): Principal {
    const id = u64IntoCanisterId(this.last_id)
    this.last_id += 1n
    return id
  }

  create_canister(params?: InstallCanisterArgs): Canister {
    let idPrin: Principal | undefined

    if (params === undefined || params.id === undefined) {
      idPrin = this.get_canister_id()
    } else {
      if (this.canisters[params.id] !== undefined) {
        throw new Error('Canister with id ' + params.id + ' is already installed')
      }
      idPrin = Principal.from(params.id)
    }

    if (idPrin === undefined) {
      throw new Error('Could not establish id for canister')
    }

    this.free_memory()

    const canister = new WasmCanister(this, idPrin)

    this.canisters[idPrin.toString()] = canister
    log('Created canister with id: %s', idPrin.toString())

    return canister
  }

  // Installs code as a canister in replica, assigns ID in similar fashion as replica
  async install_canister(
    code: WebAssembly.Module,
    params: InstallCanisterArgs
  ): Promise<Canister> {
    let idPrin: Principal | undefined

    if (params.id === undefined) {
      idPrin = this.get_canister_id()
    } else {
      if (this.canisters[params.id] !== undefined) {
        throw new Error('Canister with id ' + params.id + ' is already installed')
      }
      idPrin = Principal.from(params.id)
    }

    if (idPrin === undefined) {
      throw new Error('Could not establish id for canister')
    }

    this.free_memory()

    const canister = new WasmCanister(this, idPrin)
    await canister.install_module_candid(code, params.initArgs, params.caller ?? Principal.anonymous(), params.candid)

    this.canisters[idPrin.toString()] = canister

    log('Installed canister with id: %s', idPrin.toString())

    return canister
  }


  //If the there are more canisters than configured threshold, the oldest ones will be deleted
  free_memory() {
    const canisters = Object.values(this.canisters).filter(x => x.created > 0).sort((x, y) => x.created < y.created ? -1 : 1)
    if (canisters.length > this.maxCanisterNumber) {

      console.log("Trying to free up memory")

      for (let i = 0; i < this.freeCanisters; i++) {
        const toDelete = canisters[i];

        //Remove canister from list, it should free memory
        delete this.canisters[toDelete.get_id().toString()]
      }
    }
  }

  // Returns canister with given principal
  get_canister(id: Principal): Canister {
    return this.canisters[id.toString()]
  }

  // Removes all canisters from replica
  clean(): void {
    this.canisters = {}
    this.last_id = 0n
    this.messages = {}
    this.canisters['aaaaa-aa'] = new ManagementCanister(this)

    // this.msg_log = []
  }
}
