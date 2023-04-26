import { IDL } from '@dfinity/candid'
import { type Principal } from '@dfinity/principal'

import debug from 'debug'
import {
  UpdateCallRejectedError,
  QueryResponseStatus,
  QueryCallRejectedError
} from '@dfinity/agent'
import { type MockAgent } from './mock_agent'
import { type Canister } from './canister'

const log = debug('lightic:actor')

export type ActorMethod<Args extends unknown[] = unknown[]> = (
  ...args: Args
) => Promise<unknown>

export type ActorSubclass<T = Record<string, ActorMethod>> = MockActor & T

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class MockActor {
  // canister
  // caller

  // constructor (canister, prin) {
  //   this.canister = canister
  //   this.caller = prin
  // }

  public static createActor<T = Record<string, ActorMethod>>(
    agent: MockAgent,
    canister: Canister,
    idl: any | undefined = undefined
  ): ActorSubclass<T> {
    let service: IDL.ConstructType | undefined
    if (idl !== undefined) {
      service = idl({ IDL })
    } else {
      service = canister.get_idl()
    }
    // const service = idl ?? canister.get_idl()

    class CanisterActor extends MockActor {
      [x: string]: ActorMethod;

      constructor (agent: MockAgent, canister: Canister, service: any) {
        super()

        for (const [methodName, func] of service._fields) {
          this[methodName] = _createActorMethod(
            agent,
            canister.get_id(),
            methodName,
            func
          )
        }
      }
    }

    const item = new CanisterActor(agent, canister, service)

    return item as ActorSubclass<T>
  }
}

function _createActorMethod (
  agent: MockAgent,

  canisterId: Principal,
  methodName: string,
  func: IDL.FuncClass
): ActorMethod {
  let caller: (...args: unknown[]) => Promise<unknown>
  if (func.annotations.includes('query')) {
    caller = async (...args) => {
      log('Calling query %s', methodName)

      const arg = IDL.encode(func.argTypes, args)

      const cid = canisterId

      const result = await agent.query(cid, { methodName, arg })

      switch (result.status) {
        case QueryResponseStatus.Rejected:
          throw new QueryCallRejectedError(cid, methodName, result)

        case QueryResponseStatus.Replied:
          return decodeReturnValue(func.retTypes, result.reply.arg)
      }
    }
  } else {
    // THIS IS UPDATE CALL, WE DO NOT HANDLE IT NOW!!!!!
    caller = async (...args) => {
      log('Calling update %s', methodName)

      const arg = IDL.encode(func.argTypes, args)

      const cid = canisterId
      const ecid = canisterId

      const { requestId, response } = await agent.call(cid, {
        methodName,
        arg,
        effectiveCanisterId: ecid
      })

      if (!response.ok) {
        throw new UpdateCallRejectedError(cid, methodName, requestId, response)
      }

      // const pollStrategy = strategy.defaultStrategy()
      // const responseBytes = await pollForResponse(agent, ecid, requestId, pollStrategy)

      const responseBytes = await agent.waitForResponse(requestId)

      if (responseBytes !== undefined) {
        return decodeReturnValue(func.retTypes, responseBytes)
      } else if (func.retTypes.length === 0) {
        return undefined
      } else {
        throw new Error(`Call was returned undefined, but type [${func.retTypes.join(',')}].`)
      }
    }
  }

  const handler = async (...args: unknown[]): Promise<any> =>
    await caller(...args)
  return handler as ActorMethod
}

function decodeReturnValue (types: IDL.Type[], responseBytes: ArrayBuffer): any {
  const returnValues = IDL.decode(types, responseBytes)
  switch (returnValues.length) {
    case 0:
      return undefined
    case 1:
      return returnValues[0]
    default:
      return returnValues
  }
}
