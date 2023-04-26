use candid::{candid_method, Principal};
use ic_cdk::{
    api::{
        canister_balance, canister_balance128, canister_version, data_certificate,
        instruction_counter,
        stable::{stable64_size, stable_grow, stable_read, stable_size},
    },
    caller, id, init, post_upgrade, pre_upgrade, query, update, print, trap
};

use crate::{
    icp_ledger::call_send_dfx,
    types::{ICPTs, SendArgs},
};

#[query]
#[candid_method(query)]
pub fn test_caller() -> Principal {
    let caller_id = caller();
    print(format!("Caller Id: {caller_id}"));
    caller_id
}

#[query]
#[candid_method(query)]
pub fn test_id() -> Principal {
    let canister_id = id();
    print(format!("Canister Id: {canister_id}"));
    canister_id
}

#[query]
#[candid_method(query)]
pub fn test_balance() -> u64 {
    canister_balance()
}

#[query]
#[candid_method(query)]
pub fn test_balance128() -> u128 {
    canister_balance128()
}

#[query]
#[candid_method(query)]
pub fn test_data_certificate() -> Option<Vec<u8>> {
    data_certificate()
}

#[query]
#[candid_method(query)]
pub fn test_instruction_counter() -> u64 {
    instruction_counter()
}

#[query]
#[candid_method(query)]
pub fn test_stable_size() -> u32 {
    stable_size()
}
#[query]
#[candid_method(query)]
pub fn test_stable64_size() -> u64 {
    stable64_size()
}

#[query]
#[candid_method(query)]
pub fn test_canister_version() -> u64 {
    canister_version()
}

#[update]
#[candid_method(update)]
pub fn test_trap() -> Result<u32, String> {
    trap("This is a trap");
}

#[update]
#[candid_method(update)]
pub fn test_updates() -> Result<u32, String> {
    stable_grow(1).map_err(|x| format!("{x}"))?;
    // stable_

    let mut buf = vec![64];
    stable_read(0, &mut buf);

    Ok(0)
}

#[update]
#[candid_method(update)]
pub async fn test_inter_canister(target: Principal, to: String, amount: u64) -> Result<u32, String> {
    let args = SendArgs {
        amount: ICPTs { e8s: amount },
        memo: 0,
        fee: ICPTs { e8s: 10_000 },
        from_subaccount: None,
        to: to,
        created_at_time: None,
    };

    call_send_dfx(target, &args).await?;

    Ok(0)
}

#[pre_upgrade]
pub fn test_pre_upgrade() {}

#[post_upgrade]
pub fn test_post_upgrade() {}

#[init]
#[candid_method(init)]
pub fn test_init() {}
