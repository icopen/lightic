import { IDL } from '@dfinity/candid'
import { Message } from "./call_context";
import { Principal } from '@dfinity/principal';

export enum CanisterStatus {
  Running,
  Stopping,
  Stopped,
}

export interface Canister {
  // timestamp at which given canister was created
  created: bigint

  getIdlBuilder(): IDL.InterfaceFactory;
  get_id(): Principal;
  get_idl(): IDL.ConstructType;
  
  process_message(msg: Message): Promise<void>;

}