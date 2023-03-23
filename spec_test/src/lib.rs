use candid::export_service;
use ic_cdk::export::Principal;
use ic_cdk::query;

mod account_identifier;
mod icp_ledger;
mod types;

mod tests;

#[query(name = "__get_candid_interface_tmp_hack")]
fn export_candid() -> String {
    export_service!();
    __export_service()
}
