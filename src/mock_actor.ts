import { IDL } from "@dfinity/candid";
import { Principal } from "@dfinity/principal";
import { Canister } from "./canister";

export interface ActorMethod<Args extends unknown[] = unknown[], Ret extends unknown = unknown> {
  (...args: Args): Promise<Ret>;
}

export type ActorSubclass<T = Record<string, ActorMethod>> = Actor & T;

export class Actor {
  canister;
  caller;

  constructor(canister, prin) {
    this.canister = canister;
    this.caller = prin;
  }

  public static createActor<T = Record<string, ActorMethod>>(canister: Canister, prin: Principal): ActorSubclass<T> {
    let service = canister.get_idl();

    class CanisterActor extends Actor {
      [x: string]: ActorMethod;

      constructor(canister: Canister, service: any, prin: Principal) {
        super(canister, prin);

        for (const [methodName, func] of service._fields) {
          this[methodName] = _createActorMethod(methodName, func, canister, prin);
        }
      }
    }

    let item = new CanisterActor(canister, service, prin);

    return item as ActorSubclass<T>;
  }
}

function _createActorMethod(
  methodName: string,
  func: IDL.FuncClass,
  canister: Canister,
  prin: Principal,
): ActorMethod {
  let caller: (...args: unknown[]) => Promise<unknown>;
  if (func.annotations.includes('Query')) {
    caller = async (...args) => {

      console.log("Calling ",methodName);

      //Encode args in IDL
      const arg = IDL.encode(func.argTypes, args);
      
      let enc_result = canister.query_call(methodName, prin, arg);

      let result = IDL.decode(func.retTypes, enc_result);

      return result;

      // switch (result.status) {
      //   case QueryResponseStatus.Rejected:
      //     throw new QueryCallRejectedError(cid, methodName, result);

      //   case QueryResponseStatus.Replied:
      //     return decodeReturnValue(func.retTypes, result.reply.arg);
      // }
    };
  } else {
    // THIS IS UPDATE CALL, WE DO NOT HANDLE IT NOW!!!!!

      caller = async (...args) => {
        // First, if there's a config transformation, call it.
        // options = {
        //   ...options,
        //   ...actor[metadataSymbol].config.callTransform?.(methodName, args, {
        //     ...actor[metadataSymbol].config,
        //     ...options,
        //   }),
        // };

        // const agent = options.agent || actor[metadataSymbol].config.agent || getDefaultAgent();
        // const { canisterId, effectiveCanisterId, pollingStrategyFactory } = {
        //   ...DEFAULT_ACTOR_CONFIG,
        //   ...actor[metadataSymbol].config,
        //   ...options,
        // };
        // const cid = Principal.from(canisterId);
        // const ecid = effectiveCanisterId !== undefined ? Principal.from(effectiveCanisterId) : cid;
        const arg = IDL.encode(func.argTypes, args);

        let enc_result = canister.update_call(methodName, prin, arg);

        let result = IDL.decode(func.retTypes, enc_result);
  
        return result;
        // const { requestId, response } = await agent.call(cid, {
        //   methodName,
        //   arg,
        //   effectiveCanisterId: ecid,
        // });

        // if (!response.ok) {
        //   throw new UpdateCallRejectedError(cid, methodName, requestId, response);
        // }

        // const pollStrategy = pollingStrategyFactory();
        // const responseBytes = await pollForResponse(agent, ecid, requestId, pollStrategy, blsVerify);

        // if (responseBytes !== undefined) {
        //   return decodeReturnValue(func.retTypes, responseBytes);
        // } else if (func.retTypes.length === 0) {
        //   return undefined;
        // } else {
        //   throw new Error(`Call was returned undefined, but type [${func.retTypes.join(',')}].`);
        // }
      };
  }

  const handler = (...args: unknown[]) => caller(...args);
  return handler as ActorMethod;
}