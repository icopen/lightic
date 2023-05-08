import { ConstructType, InterfaceFactory } from "@dfinity/candid/lib/cjs/idl"
import { CallStatus, Message, RejectionCode } from "./call_context"
import { Canister } from "./canister"
import { InstallCanisterArgs, ReplicaContext } from "./replica_context"
import { Principal } from "@dfinity/principal"

import { idlFactory } from './mgmt.did'
import { IDL } from "@dfinity/candid"

import crypto from 'crypto'
import { CanisterInstallMode } from "@dfinity/agent"
import { WasmCanister } from "./wasm_canister"
import { loadWasm } from "./instrumentation"

interface CanisterSettings {
  controllers: [],
  compute_allocation: [],
  memory_allocation: [],
  freezing_threshold: []
}

interface ProvisionalArgs {
  amount: [],
  settings: CanisterSettings[],
  specified_id: string[]
}

interface ProvisionalResult {
  canister_id: Principal
}

class CustomError implements Error {
  name: string
  message: string
  stack?: string | undefined
  code: number
}

export class ManagementCanister implements Canister {
  private context: ReplicaContext

  private idl: ConstructType
  readonly created: bigint

  constructor(context: ReplicaContext) {
    this.context = context
    this.idl = idlFactory({ IDL })
    this.created = 0n
  }
  getIdlBuilder(): InterfaceFactory {
    throw new Error("Method not implemented.")
  }
  get_id(): Principal {
    throw new Error("Method not implemented.")
  }
  get_idl(): ConstructType {
    return this.idl
  }
  async process_message(msg: Message): Promise<void> {
    const fun = this[msg.method]

    if (fun !== undefined) {
      for (const field of (this.idl as any)._fields) {
        if (field[0] === msg.method) {
          const argTypes = field[1].argTypes
          const retTypes = field[1].retTypes

          if (msg.args_raw !== undefined) {
            const args = IDL.decode(argTypes, msg.args_raw)

            try {
              let result = fun.apply(this, [msg, ...args])

              if (result instanceof Promise) {
                result = await result
              }

              if (result === undefined) {
                result = []
              } else {
                result = [result]
              }

              const ret = IDL.encode(retTypes, result)

              msg.result = ret
              msg.status = CallStatus.Ok
            } catch (e) {
              msg.status = CallStatus.Error
              msg.rejectionCode = e.code ?? RejectionCode.CanisterError
              msg.rejectionMessage = new TextEncoder().encode(e.message)
            }
          }
        }
      }
    }

    else {
      console.log(`Invalid function ${msg.method}`)

      msg.status = CallStatus.Error
      msg.rejectionCode = RejectionCode.CanisterReject
      msg.rejectionMessage = new TextEncoder().encode(`Invalid function ${msg.method}`)
    }

  }

  raw_rand(): ArrayBuffer {
    const view = new Uint8Array(32)
    crypto.webcrypto.getRandomValues(view)

    const result = IDL.encode([IDL.Vec(IDL.Nat8)], [view])
    return result
  }

  provisional_create_canister_with_cycles(msg: Message, args: ProvisionalArgs | null): ProvisionalResult {
    const params: InstallCanisterArgs = {
      caller: msg.sender,
    }

    if (args !== undefined && args !== null && args.specified_id.length === 1) {
      params.id = args.specified_id[0].toString()
    }

    try {
      const canister = this.context.create_canister(params)

      return { canister_id: canister.get_id() }
    } catch (e) {
      const err = new CustomError()
      err.message = e.message
      err.code = RejectionCode.DestinationInvalid

      throw err
    }
  }

  async install_code(msg: Message, arg: { arg: ArrayBuffer, wasm_module: ArrayBuffer, mode: CanisterInstallMode, canister_id: Principal }): Promise<void> {
    const canister = this.context.get_canister(arg.canister_id) as WasmCanister
    if (canister !== undefined) {
      const module = await loadWasm(Buffer.from(arg.wasm_module))

      await canister.install_module(module, arg.arg, msg.sender ?? Principal.anonymous())
    } else {
      throw new Error('Canister not found')
    }
  }
}