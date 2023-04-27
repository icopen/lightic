import { ConstructType, InterfaceFactory } from "@dfinity/candid/lib/cjs/idl"
import { CallStatus, Message } from "./call_context"
import { Canister } from "./canister"
import { ReplicaContext } from "./replica_context"
import { Principal } from "@dfinity/principal"

import { idlFactory } from './mgmt.did'
import { IDL } from "@dfinity/candid"

import crypto from 'crypto'
import { ReadableStreamDefaultReader } from "node:stream/web"

export class ManagementCanister implements Canister {
  private context: ReplicaContext

  constructor(context: ReplicaContext) {
    this.context = context
  }
  getIdlBuilder(): InterfaceFactory {
    throw new Error("Method not implemented.")
  }
  get_id(): Principal {
    throw new Error("Method not implemented.")
  }
  get_idl(): ConstructType<any> {
    let idl = idlFactory({IDL});
    return idl
  }
  process_message(msg: Message): void {
    let fun = this[msg.method]

    if (fun !== undefined) {
      let result = fun() as ArrayBuffer
      msg.result = result
    }

    msg.status = CallStatus.Ok
  }

  raw_rand(): ArrayBuffer {
    // let a = new Uint32Array(1)

    let view = new Uint8Array(32)
    crypto.webcrypto.getRandomValues(view)

    let result = IDL.encode([IDL.Vec(IDL.Nat8)], [view])
    return result
  }
}