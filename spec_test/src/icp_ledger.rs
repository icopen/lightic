use ic_cdk::api::call::call_raw;
use ic_cdk::export::candid::{encode_args, Decode, Principal};
use ic_cdk::print;

use crate::types::{NotifyArgs, SendArgs};

pub async fn call_send_dfx(canister: Principal, args: &SendArgs) -> Result<u64, String> {
    //Encode args in candid
    let event_raw =
        encode_args((args,)).map_err(|_| String::from("Cannot serialize Transaction Args"))?;

    print(format!("array size: {}", event_raw.len()));

    //Inter container call to ledger canister
    let raw_res = call_raw(canister, "send_dfx", &event_raw, 0)
        .await
        .map_err(|(_, s)| format!("Error invoking Ledger Canister, {}", &s))?;

    // //Todo: deserialize send_dfx result to get block height!
    let res = Decode!(&raw_res, u64)
        .map_err(|_| String::from("Error decoding response from Ledger canister"))?;

    Ok(res)
}

#[allow(dead_code)]
pub async fn call_notify_dfx(canister: Principal, args: &NotifyArgs) -> Result<u64, String> {
    //Encode args in candid
    let event_raw =
        encode_args((args,)).map_err(|_| String::from("Cannot serialize Transaction Args"))?;

    //Inter container call to ledger canister
    let raw_res = call_raw(canister, "notify_dfx", &event_raw, 0)
        .await
        .map_err(|(_, s)| format!("Error invoking Ledger Canister, {}", &s))?;

    // //Todo: deserialize send_dfx result to get block height!
    let res = Decode!(&raw_res, u64)
        .map_err(|_| String::from("Error decoding response from Ledger canister"))?;

    Ok(res)
}
