import { IDL } from '@dfinity/candid'
import { Principal } from '@dfinity/principal'

// More info is in file subnet_config.rs about subnet parameters and costs
export enum SubnetType {
  Unspecified = 0,
  /// A normal subnet where no restrictions are applied.
  Application = 1,
  /// A more privileged subnet where certain restrictions are applied,
  /// like not charging for cycles or restricting who can create and
  /// install canisters on it.
  System = 2,
  /// A subnet type that is like application subnets but can have some
  /// additional features.
  VerifiedApplication = 4,
}

export enum CallSource {
  Ingress = 'Ingress',
  InterCanister = 'InterCanister',
  XNet = 'XNet',
  Internal = 'Internal',
}

export enum CallType {
  Init = 'I',
  PreUpgrade = 'G',
  Update = 'U',
  Query = 'Q',
  ReplyCallback = 'Ry',
  RejectCallback = 'Rt',
  Cleanup = 'C',
  Start = 's',
  InspectMessage = 'F',
  SystemTask = 'T',
}

export enum RejectionCode {
  NoError = 0,

  SysFatal = 1,
  SysTransient = 2,
  DestinationInvalid = 3,
  CanisterReject = 4,
  CanisterError = 5,

  Unknown,
}

export class CallContext {
  type: CallType
}

export enum CallStatus {
  New = 'New',
  Processing = 'Processing',
  Error = 'Error',
  Ok = 'Ok'
}
export class Message {
  id: string
  type: CallType
  source: CallSource

  target: Principal
  sender: Principal

  method: string
  args_raw: ArrayBuffer | null
  payment: number

  status: CallStatus

  result: ArrayBuffer | null

  replyFun: number
  replyEnv: number
  rejectFun: number
  rejectEnv: number
  replyContext: Message

  constructor (source: Partial<Message>) {
    this.status = CallStatus.New
    Object.assign(this, source)
  }

  getMethodName (): string {
    if (this.type === CallType.Update) {
      return 'canister_update ' + this.method
    }
    if (this.type === CallType.Query) {
      return 'canister_query ' + this.method
    }
    if (this.type === CallType.Init) {
      return 'canister_init'
    }

    return this.method
  }

  static init (canister: Principal, args: ArrayBuffer): Message {
    return new Message({
      type: CallType.Init,
      source: CallSource.Internal,
      target: canister,
      sender: Principal.anonymous(),
      method: '',
      args_raw: args
    })
  }

  static candidHack (canister: Principal): Message {
    return new Message({
      type: CallType.Query,
      source: CallSource.Internal,
      target: canister,
      sender: Principal.anonymous(),
      method: '__get_candid_interface_tmp_hack',
      args_raw: IDL.encode([], []),
      payment: 0
    })
  }

  static query (
    canister: Principal, name: string, caller: Principal, args: ArrayBuffer
  ): Message {
    return new Message({
      type: CallType.Query,
      source: CallSource.Ingress,
      target: canister,
      sender: caller,
      method: name,
      args_raw: args,
      payment: 0
    })
  }

  static update (
    canister: Principal, name: string, caller: Principal, args: ArrayBuffer
  ): Message {
    return new Message({
      type: CallType.Update,
      source: CallSource.Ingress,
      target: canister,
      sender: caller,
      method: name,
      args_raw: args,
      payment: 0
    })
  }
}
