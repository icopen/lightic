import { IDL } from '@dfinity/candid'
import { Message } from "./call_context";
import { Principal } from '@dfinity/principal';

export enum CanisterStatus {
  Running,
  Stopping,
  Stopped,
}

export interface Canister {
  getIdlBuilder(): IDL.InterfaceFactory;
  get_id(): Principal;
  get_idl(): IDL.ConstructType;
  
  process_message(msg: Message): void;

}