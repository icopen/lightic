import { type JsonObject } from '@dfinity/candid'
import { Principal } from '@dfinity/principal'

// import debug from 'debug'
import {
  type Identity, type QueryFields, type QueryResponse,
  type QueryResponseReplied,
  QueryResponseStatus, type Agent, type CallOptions,
  type SubmitResponse, type ReadStateOptions, type ReadStateResponse,
  type RequestId,
  Cbor,
  fromHex
} from '@dfinity/agent'
import { type ActorSubclass, MockActor } from './mock_actor'
import { type ReplicaContext } from './replica_context'
import { Canister } from './canister'
import { CallSource, CallStatus, CallType, Message } from './call_context'

// const log = debug('lightic:actor')

// export type ActorMethod<Args extends unknown[] = unknown[]> = (
//   ...args: Args
// ) => Promise<unknown>

// export type ActorSubclass<T = Record<string, ActorMethod>> = MockActor & T

const DER_PREFIX = fromHex(
  '308182301d060d2b0601040182dc7c0503010201060c2b0601040182dc7c05030201036100'
)

export class MockAgent implements Agent {
  readonly rootKey: ArrayBuffer | null

  readonly replica: ReplicaContext
  readonly caller: Principal

  constructor (replica: ReplicaContext, identity: Principal) {
    this.replica = replica
    this.caller = identity

    const rootKey = new Uint8Array(133)
    rootKey.set(new Uint8Array(DER_PREFIX))
    this.rootKey = rootKey

    // const ctx = new CTX('BLS12381')
    // if (ctx.BLS.init() !== 0) {
    //   throw new Error('Cannot initialize BLS')
    // }

    // const RAW: number[] = []
    // const rng = new ctx.RAND()

    // rng.clean()
    // for (let i = 0; i < 100; i++) {
    //   RAW[i] = i
    // }
    // rng.seed(100, RAW)

    // const W0 = []
    // const S0 = []

    // ctx.ECDH.KEY_PAIR_GENERATE(rng, S0, W0)

    // const valid = ctx.ECDH.PUBLIC_KEY_VALIDATE(W0)
    // if (valid !== 0) {
    //   console.error('ECP_ZZZ Public Key is invalid!')
    // }
  }

  async getPrincipal (): Promise<Principal> {
    return this.caller
  }

  getActor (canister: Canister | string, idl: any | undefined = undefined): ActorSubclass {
    if (canister instanceof Canister) {
      return MockActor.createActor(this, canister, idl)
    } else {
      const item = this.replica.get_canister(Principal.from(canister))
      return MockActor.createActor(this, item, idl)
    }
  }

  async createReadStateRequest? (options: ReadStateOptions, identity?: Identity): Promise<any> {
    return ''
  }

  async readState (effectiveCanisterId: Principal | string, options: ReadStateOptions, identity?: Identity, request?: any): Promise<ReadStateResponse> {
    const name = new TextDecoder().decode(options.paths[0][0])
    const msg = this.replica.get_message(options.paths[0][1] as any as string)

    if (name === 'request_status') {
      const cert = Cbor.encode({
        tree: [2, options.paths[0][0], [2, new TextEncoder().encode(msg.id), [1, [2, new TextEncoder().encode('reply'), [3, msg.result]], [2, new TextEncoder().encode('status'), [3, new TextEncoder().encode('replied')]]]]],
        signature: {},
        delegation: false
      })

      const resp: ReadStateResponse = {
        certificate: cert
      }

      return resp
    }

    throw new Error('Not implemented path: ' + name)
  }

  async call (canisterId: Principal | string, fields: CallOptions): Promise<SubmitResponse> {
    let target: Principal

    if (canisterId instanceof Principal) {
      target = canisterId
    } else {
      target = Principal.from(canisterId)
    }

    const msg = new Message({
      type: CallType.Update,
      source: CallSource.Ingress,

      target,
      sender: this.caller,

      method: fields.methodName,
      args_raw: fields.arg
    })

    // Store and process message
    this.replica.store_message(msg)
    this.replica.process_messages()

    const requestId = msg.id as any as RequestId

    return {
      requestId,
      response: {
        ok: true,
        status: 0,
        statusText: ''
      }
    }
  }

  async waitForResponse (requestId: RequestId): Promise<ArrayBuffer> {
    const msg = this.replica.get_message(requestId as any as string)

    // await this.replica.process_pending_messages()

    if (msg.status === CallStatus.Ok && msg.result !== null) {
      return msg.result
    }

    throw new Error('Message was not fully processed!')
  }

  async status (): Promise<JsonObject> {
    const res: JsonObject = { res: {} }

    return res
  }

  async query (canisterId: Principal | string, options: QueryFields): Promise<QueryResponse> {
    let target: Principal
    if (canisterId instanceof Principal) {
      target = canisterId
    } else {
      target = Principal.from(canisterId)
    }

    const msg = new Message({
      type: CallType.Query,
      source: CallSource.Ingress,

      target,
      sender: this.caller,

      method: options.methodName,
      args_raw: options.arg
    })

    // Store and process message
    this.replica.store_message(msg)
    this.replica.process_messages()

    const response: QueryResponseReplied = {
      status: QueryResponseStatus.Replied,
      reply: {
        arg: msg.result as ArrayBuffer
      }
    }

    return response
  }

  async fetchRootKey (): Promise<ArrayBuffer> {
    return this.rootKey ?? new Uint8Array(32)
  }

  invalidateIdentity? (): void {

  }

  replaceIdentity? (identity: Identity): void {

  }
}
