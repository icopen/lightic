use candid::{
    check_prog,
    parser::{
        types::IDLType,
        typing::{check_type, Env},
    },
    types::Type,
    IDLProg, TypeEnv,
};

mod target_json;

fn check_actor(env: &Env, actor: &Option<IDLType>) -> Result<Option<Type>, candid::error::Error> {
    match actor {
        None => Ok(None),
        Some(IDLType::ClassT(ts, t)) => {
            let mut args = Vec::new();
            for arg in ts.iter() {
                args.push(check_type(env, arg)?);
            }
            let serv = check_type(env, t)?;
            env.te.as_service(&serv)?;
            Ok(Some(Type::Class(args, Box::new(serv))))
        }
        Some(typ) => {
            let t = check_type(env, typ)?;
            env.te.as_service(&t)?;
            Ok(Some(t))
        }
    }
}

fn check_file_(prog: &str) -> Result<(TypeEnv, Option<Type>), candid::error::Error> {
    let prog = prog.parse::<IDLProg>()?;
    
    let mut te = TypeEnv::new();

    check_prog(&mut te, &prog)?;

    let env = Env {
        te: &mut te,
        pre: false,
    };

    let actor = check_actor(&env, &prog.actor)?;
    Ok((te, actor))
}

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn parse_candid_to_js(data: &str) -> Result<String, String> {
    let (env, actor) = check_file_(data).map_err(|x| format!("{x}"))?;

    Ok(candid::bindings::javascript::compile(&env, &actor))
}

#[wasm_bindgen]
pub fn parse_candid(data: &str) -> Result<String, String> {
    let (env, actor) = check_file_(data).map_err(|x| format!("{x}"))?;

    Ok(target_json::compile(&env, &actor))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_test_2() -> Result<(), String> {
      let data = "type Result = variant { Ok : nat32; Err : text };service : () -> {  test_balance : () -> (nat64) query;  test_balance128 : () -> (nat) query;  test_caller : () -> (principal) query;  test_canister_version : () -> (nat64) query;  test_data_certificate : () -> (opt vec nat8) query;  test_id : () -> (principal) query;  test_instruction_counter : () -> (nat64) query;  test_inter_canister : () -> (Result);  test_stable64_size : () -> (nat64) query;  test_stable_size : () -> (nat32) query;  test_updates : () -> (Result);}";
      let result = parse_candid(data)?;

      println!("{result}");


      Ok(())
    }

    #[test]
    fn parse_test() -> Result<(), String> {
        let data = "type AccessList = record { storage_keys : vec vec nat8; address : vec nat8 };
        type Item = variant {
          Num : nat64;
          Raw : vec nat8;
          Empty;
          List : List;
          Text : text;
        };
        type List = record { values : vec Item };
        type Result = variant { Ok : record { vec nat8; vec nat8 }; Err : text };
        type Result_1 = variant { Ok; Err : text };
        type Result_2 = variant { Ok : Transaction; Err : text };
        type Result_3 = variant { Ok : vec nat8; Err : text };
        type Result_4 = variant { Ok : List; Err : text };
        type Result_5 = variant { Ok : opt vec nat8; Err : text };
        type Signature = record {
          r : vec nat8;
          s : vec nat8;
          v : nat64;
          from : opt vec nat8;
          hash : vec nat8;
        };
        type Transaction = variant {
          EIP1559 : Transaction1559;
          EIP2930 : Transaction2930;
          Legacy : TransactionLegacy;
        };
        type Transaction1559 = record {
          to : vec nat8;
          value : nat64;
          max_priority_fee_per_gas : nat64;
          data : vec nat8;
          sign : opt Signature;
          max_fee_per_gas : nat64;
          chain_id : nat64;
          nonce : nat64;
          gas_limit : nat64;
          access_list : vec AccessList;
        };
        type Transaction2930 = record {
          to : vec nat8;
          value : nat64;
          data : vec nat8;
          sign : opt Signature;
          chain_id : nat64;
          nonce : nat64;
          gas_limit : nat64;
          access_list : vec AccessList;
          gas_price : nat64;
        };
        type TransactionLegacy = record {
          to : vec nat8;
          value : nat64;
          data : vec nat8;
          sign : opt Signature;
          chain_id : nat64;
          nonce : nat64;
          gas_limit : nat64;
          gas_price : nat64;
        };
        service : {
          create_transaction : (Transaction) -> (Result) query;
          is_valid_public : (vec nat8) -> (Result_1) query;
          is_valid_signature : (vec nat8) -> (Result_1) query;
          keccak256 : (vec nat8) -> (vec nat8) query;
          parse_transaction : (vec nat8) -> (Result_2) query;
          pub_to_address : (vec nat8) -> (Result_3) query;
          recover_public_key : (vec nat8, vec nat8) -> (Result_3) query;
          rlp_decode : (vec nat8) -> (Result_4) query;
          rlp_encode : (List) -> (Result_3) query;
          verify_proof : (vec nat8, vec nat8, vec vec nat8) -> (Result_5) query;
        }";

        let result = parse_candid(data)?;

        println!("{result}");


        Ok(())
    }
}
