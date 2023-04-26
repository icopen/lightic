import { Principal } from '@dfinity/principal'
import { Canister } from './canister'

import debug from 'debug'
import { CallSource, CallStatus, CallType, Message } from './call_context'
import { u64IntoCanisterId } from './utils'
const log = debug('lightic:replica')

export class ReplicaContext {
  private last_id: bigint
  private canisters: Record<string, Canister>
  // private msg_log: Message[]

  private messages: Record<string, Message>

  constructor () {
    this.canisters = {}
    this.last_id = 0n
    this.messages = {}

    // this.msg_log = []
  }

  // // Processes all pending messages
  // async process_pending_messages (): Promise<void> {
  //   const pending = Object.values(this.messages).filter((x) => x.status === CallStatus.New)

  //   for (let msg in pending) {

  //   }

  //   throw new Error('Method not implemented.')
  // }

  // Processes messages
  // Todo: add correct replica errors
  private process_message (msg: Message): ArrayBuffer | null {
    const canister = this.canisters[msg.target.toString()]
    canister.process_message(msg)

    // Process any waiting messages, before returning, ie all inter-canister calls
    this.process_messages()

    return msg.result
  }

  // Store message for processing
  store_message (msg: Message): void {
    const canister = this.canisters[msg.target.toString()]

    if (canister === undefined) {
      throw new Error('Canister not found! ' + msg.target.toString())
    }

    msg.id = (Object.keys(this.messages).length + 1).toString()
    this.messages[msg.id] = msg
  }

  // Process all waiting messages
  process_messages (): void {
    while (Object.values(this.messages).some((x) => x.status === CallStatus.New)) {
      // Take first message from list for processing
      const msg = Object.values(this.messages).filter((x) => x.status === CallStatus.New)[0]
      this.process_message(msg)

      if (msg.source === CallSource.InterCanister && msg.type === CallType.Update) {
        if (msg.status === CallStatus.Ok) {
          const reply: Message = new Message({
            source: CallSource.InterCanister,
            type: CallType.ReplyCallback,
            target: msg.sender,
            sender: msg.target,
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

  get_message (id: string): Message {
    return this.messages[id]
  }

  get_canisters (): Canister[] {
    return Object.values(this.canisters)
  }

  get_canister_id (): Principal {
    const id = u64IntoCanisterId(this.last_id + 1n)
    this.last_id += 1n
    return id
  }

  // Installs code as a canister in replica, assigns ID in similar fashion as replica
  async install_canister (
    code: WebAssembly.Module,
    initArgs: any,
    candid?: string,
    id?: string
  ): Promise<Canister> {
    let idPrin: Principal | undefined

    if (id === undefined) {
      idPrin = this.get_canister_id()
    } else {
      if (this.canisters[id] !== undefined) {
        throw new Error('Canister with id ' + id + ' is already installed')
      }
      idPrin = Principal.from(id)
    }

    if (idPrin === undefined) {
      throw new Error('Could not establish id for canister')
    }

    const canister = new Canister(this, idPrin, code)
    await canister.init(initArgs, candid)

    this.canisters[idPrin.toString()] = canister

    log('Installed canister with id: %s', idPrin.toString())

    return canister
  }

  // Returns canister with given principal
  get_canister (id: Principal): Canister {
    return this.canisters[id.toString()]
  }

  // Removes all canisters from replica
  clean (): void {
    this.canisters = {}
    this.last_id = 0n
    this.messages = {}
    // this.msg_log = []
  }
}
