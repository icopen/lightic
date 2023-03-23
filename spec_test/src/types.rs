use ic_cdk::export::candid::{CandidType, Deserialize, Principal};
use serde::Serialize;

use crate::account_identifier::Subaccount;

#[derive(Clone, CandidType, Deserialize, Serialize)]
pub struct Property {
    pub name: String,
    pub value: String,
}

#[derive(Clone, CandidType, Deserialize)]
pub struct MintRequest {
    pub name: String,
    pub url: String,
    pub desc: String,
    pub properties: Vec<Property>,
    pub data: Vec<u8>,
    pub content_type: String,
    pub owner: Principal,
}

#[derive(CandidType, Deserialize, Clone, Serialize)]
#[allow(non_camel_case_types)]
pub enum Operation {
    delist,
    init,
    list,
    mint,
    burn,
    purchase,
    transfer,
    approval,
}

impl Default for Operation {
    fn default() -> Self {
        Operation::init
    }
}

#[derive(Clone, CandidType, Deserialize)]
pub struct Record {
    pub caller: Principal,
    pub op: Operation,
    pub from: Option<Principal>,
    pub to: Option<Principal>,
    pub token_id: u128,
    pub price: u64,
    pub timestamp: u128,
}

#[derive(Clone, CandidType, Deserialize, Serialize)]
pub struct ICPTs {
    pub e8s: u64,
}

#[derive(Clone, CandidType, Deserialize, Serialize)]
pub struct TransactionNotification {
    pub amount: ICPTs,
    pub block_height: u64,
    pub from: Principal,
    pub from_subaccount: Option<Subaccount>,
    pub memo: u64,
    pub to: Principal,
    pub to_subaccount: Option<Subaccount>,
}

#[derive(Clone, CandidType, Deserialize, Serialize)]
pub struct TransactionResponse {
    pub block: u64,
    pub creators_fee: u64,
    pub seller: Principal,
}

#[derive(Clone, CandidType, Deserialize, Serialize)]
pub struct TimeStamp {
    pub timestamp_nanos: u64,
}

// #[derive(Copy, Clone, CandidType, Deserialize, Serialize)]
// pub struct Subaccount(pub [u8; 32]);

#[derive(Clone, CandidType, Serialize, Deserialize)]
pub struct SendArgs {
    pub memo: u64,
    pub amount: ICPTs,
    pub fee: ICPTs,
    pub from_subaccount: Option<Subaccount>,
    pub to: String,
    pub created_at_time: Option<TimeStamp>,
}

#[derive(Clone, CandidType, Serialize, Deserialize)]
pub struct NotifyArgs {
    pub block_height: u64,
    pub max_fee: ICPTs,
    pub from_subaccount: Option<Subaccount>,
    pub to_canister: Principal,
    pub to_subaccount: Option<Subaccount>,
}
