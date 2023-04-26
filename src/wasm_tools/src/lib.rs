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

use instrumentation::export_table;
use wasm_bindgen::prelude::*;
use wasm_transform::Module;

#[wasm_bindgen]
pub fn parse_candid_to_js(data: &str) -> Result<String, String> {
    let (env, actor) = check_file_(data).map_err(|x| format!("{x}"))?;

    Ok(candid::bindings::javascript::compile(&env, &actor))
}

#[wasm_bindgen]
pub fn parse_candid_to_ts(data: &str) -> Result<String, String> {
    let (env, actor) = check_file_(data).map_err(|x| format!("{x}"))?;

    Ok(candid::bindings::typescript::compile(&env, &actor))
}

#[wasm_bindgen]
pub fn parse_candid(data: &str) -> Result<String, String> {
    let (env, actor) = check_file_(data).map_err(|x| format!("{x}"))?;

    Ok(target_json::compile(&env, &actor))
}

mod wasm_transform;
mod instrumentation;

#[wasm_bindgen]
pub fn wasm_instrument(data: &[u8]) -> Result<Vec<u8>, String> {

  let mut module = Module::parse(data, false)
  .map_err(|x| format!("{x}"))?;

  module = export_table(module);

  let enc = module.encode()
  .map_err(|x| format!("{x}"))?;
  
  Ok(enc)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{Value};

    #[test]
    fn parse_test_4() -> Result<(), String> {
      let data = "type WhitelistSlot = 
      record {
        end: Time__2;
        start: Time__2;
      };
     type User = 
      variant {
        address: AccountIdentifier;
        \"principal\": principal;
      };
     type UpdateInformationRequest = record {
                                       metrics: opt CollectMetricsRequestType;};
     type UpdateCallsAggregatedData = vec nat64;
     type TransferResponse = 
      variant {
        err:
         variant {
           CannotNotify: AccountIdentifier;
           InsufficientBalance;
           InvalidToken: TokenIdentifier;
           Other: text;
           Rejected;
           Unauthorized: AccountIdentifier;
         };
        ok: Balance;
      };
     type TransferRequest = 
      record {
        amount: Balance;
        from: User;
        memo: Memo;
        notify: bool;
        subaccount: opt SubAccount;
        to: User;
        token: TokenIdentifier;
      };
     type Transaction = 
      record {
        buyer: AccountIdentifier__1;
        price: nat64;
        seller: principal;
        time: Time;
        token: TokenIdentifier__1;
      };
     type TokenIndex__4 = nat32;
     type TokenIndex__3 = nat32;
     type TokenIndex__2 = nat32;
     type TokenIndex__1 = nat32;
     type TokenIndex = nat32;
     type TokenIdentifier__3 = text;
     type TokenIdentifier__2 = text;
     type TokenIdentifier__1 = text;
     type TokenIdentifier = text;
     type Time__2 = int;
     type Time__1 = int;
     type Time = int;
     type SubAccount__3 = vec nat8;
     type SubAccount__2 = vec nat8;
     type SubAccount__1 = vec nat8;
     type SubAccount = vec nat8;
     type StatusResponse = 
      record {
        cycles: opt nat64;
        heap_memory_size: opt nat64;
        memory_size: opt nat64;
      };
     type StatusRequest = 
      record {
        cycles: bool;
        heap_memory_size: bool;
        memory_size: bool;
      };
     type StableState__5 = 
      record {
        _nextTokenIdState: TokenIndex__4;
        _ownersState: vec record {
                            AccountIdentifier__6;
                            vec TokenIndex__4;
                          };
        _registryState: vec record {
                              TokenIndex__4;
                              AccountIdentifier__6;
                            };
        _supplyState: Balance__2;
        _tokenMetadataState: vec record {
                                   TokenIndex__4;
                                   Metadata;
                                 };
      };
     type StableState__4 = record {_isShuffledState: bool;};
     type StableState__3 = 
      record {
        _failedSalesState: vec record {
                                 AccountIdentifier__4;
                                 SubAccount__1;
                               };
        _nextSubAccountState: nat;
        _saleTransactionsState: vec SaleTransaction;
        _salesSettlementsState: vec record {
                                      AccountIdentifier__4;
                                      Sale;
                                    };
        _soldIcpState: nat64;
        _soldState: nat;
        _tokensForSaleState: vec TokenIndex__2;
        _totalToSellState: nat;
        _whitelistStable: vec record {
                                nat64;
                                AccountIdentifier__4;
                                WhitelistSlot;
                              };
      };
     type StableState__2 = 
      record {
        _frontendsState: vec record {
                               text;
                               Frontend;
                             };
        _tokenListingState: vec record {
                                  TokenIndex__1;
                                  Listing;
                                };
        _tokenSettlementState: vec record {
                                     TokenIndex__1;
                                     Settlement;
                                   };
        _transactionsState: vec Transaction;
      };
     type StableState__1 = record {_disbursementsState: vec Disbursement;};
     type StableState = record {_assetsState: vec Asset;};
     type StableChunk__6 = 
      opt
       variant {
         legacy: StableState__5;
         v1:
          record {
            nextTokenId: TokenIndex__4;
            owners: vec record {
                          AccountIdentifier__6;
                          vec TokenIndex__4;
                        };
            registry: vec record {
                            TokenIndex__4;
                            AccountIdentifier__6;
                          };
            supply: Balance__2;
            tokenMetadata: vec record {
                                 TokenIndex__4;
                                 Metadata;
                               };
          };
       };
     type StableChunk__5 = 
      opt variant {
            legacy: StableState__4;
            v1: record {isShuffled: bool;};
          };
     type StableChunk__4 = 
      opt
       variant {
         legacy: StableState__3;
         v1:
          record {
            failedSales: vec record {
                               AccountIdentifier__4;
                               SubAccount__1;
                             };
            nextSubAccount: nat;
            saleTransactionChunk: vec SaleTransaction;
            saleTransactionCount: nat;
            salesSettlements: vec record {
                                    AccountIdentifier__4;
                                    Sale;
                                  };
            sold: nat;
            soldIcp: nat64;
            tokensForSale: vec TokenIndex__2;
            totalToSell: nat;
            whitelist: vec record {
                             nat64;
                             AccountIdentifier__4;
                             WhitelistSlot;
                           };
          };
         v1_chunk: record {saleTransactionChunk: vec SaleTransaction;};
       };
     type StableChunk__3 = 
      opt
       variant {
         legacy: StableState__2;
         v1:
          record {
            frontends: vec record {
                             text;
                             Frontend;
                           };
            tokenListing: vec record {
                                TokenIndex__1;
                                Listing;
                              };
            tokenSettlement: vec record {
                                   TokenIndex__1;
                                   Settlement;
                                 };
            transactionChunk: vec Transaction;
            transactionCount: nat;
          };
         v1_chunk: record {transactionChunk: vec Transaction;};
       };
     type StableChunk__2 = 
      opt
       variant {
         legacy: StableState__1;
         v1: record {disbursements: vec Disbursement;};
       };
     type StableChunk__1 = 
      opt variant {
            legacy: StableState;
            v1: record {assets: vec Asset;};
          };
     type StableChunk = variant {
                          v1:
                           record {
                             assets: StableChunk__1;
                             disburser: StableChunk__2;
                             marketplace: StableChunk__3;
                             sale: StableChunk__4;
                             shuffle: StableChunk__5;
                             tokens: StableChunk__6;
                           };};
     type Settlement = 
      record {
        buyer: AccountIdentifier__1;
        buyerFrontend: opt text;
        price: nat64;
        seller: principal;
        sellerFrontend: opt text;
        subaccount: SubAccount__3;
      };
     type SaleTransaction = 
      record {
        buyer: AccountIdentifier__4;
        price: nat64;
        seller: principal;
        time: Time__1;
        tokens: vec TokenIndex__2;
      };
     type SaleSettings = 
      record {
        bulkPricing: vec record {
                           nat64;
                           nat64;
                         };
        endTime: Time__1;
        openEdition: bool;
        price: nat64;
        remaining: nat;
        salePrice: nat64;
        sold: nat;
        startTime: Time__1;
        totalToSell: nat;
        whitelist: bool;
        whitelistTime: Time__1;
      };
     type Sale = 
      record {
        buyer: AccountIdentifier__4;
        expires: Time__1;
        price: nat64;
        slot: opt WhitelistSlot;
        subaccount: SubAccount__1;
        tokens: vec TokenIndex__2;
      };
     type Result_9 = 
      variant {
        err: CommonError__2;
        ok: AccountIdentifier__6;
      };
     type Result_8 = 
      variant {
        err: CommonError__1;
        ok: record {
              AccountIdentifier__1;
              opt Listing;
            };
      };
     type Result_7 = 
      variant {
        err: CommonError__1;
        ok: AccountIdentifier__1;
      };
     type Result_6 = 
      variant {
        err: CommonError;
        ok: Metadata__1;
      };
     type Result_5 = 
      variant {
        err: text;
        ok: record {
              AccountIdentifier__4;
              nat64;
            };
      };
     type Result_4 = 
      variant {
        err: text;
        ok;
      };
     type Result_3 = 
      variant {
        err: CommonError__1;
        ok;
      };
     type Result_2 = 
      variant {
        err: CommonError;
        ok: Balance__1;
      };
     type Result_1 = 
      variant {
        err: CommonError;
        ok: vec TokenIndex;
      };
     type Result = 
      variant {
        err: CommonError;
        ok: vec record {
                  TokenIndex;
                  opt Listing;
                  opt blob;
                };
      };
     type NumericEntity = 
      record {
        avg: nat64;
        first: nat64;
        last: nat64;
        max: nat64;
        min: nat64;
      };
     type Nanos = nat64;
     type MetricsResponse = record {metrics: opt CanisterMetrics;};
     type MetricsRequest = record {parameters: GetMetricsParameters;};
     type MetricsGranularity = 
      variant {
        daily;
        hourly;
      };
     type Metadata__2 = 
      variant {
        fungible:
         record {
           decimals: nat8;
           metadata: opt blob;
           name: text;
           symbol: text;
         };
        nonfungible: record {metadata: opt blob;};
      };
     type Metadata__1 = 
      variant {
        fungible:
         record {
           decimals: nat8;
           metadata: opt blob;
           name: text;
           symbol: text;
         };
        nonfungible: record {metadata: opt blob;};
      };
     type Metadata = 
      variant {
        fungible:
         record {
           decimals: nat8;
           metadata: opt blob;
           name: text;
           symbol: text;
         };
        nonfungible: record {metadata: opt blob;};
      };
     type Memo = blob;
     type LogMessagesData = 
      record {
        message: text;
        timeNanos: Nanos;
      };
     type Listing = 
      record {
        buyerFrontend: opt text;
        locked: opt Time;
        price: nat64;
        seller: principal;
        sellerFrontend: opt text;
      };
     type ListRequest = 
      record {
        from_subaccount: opt SubAccount__3;
        frontendIdentifier: opt text;
        price: opt nat64;
        token: TokenIdentifier__1;
      };
     type HttpStreamingStrategy = variant {
                                    Callback:
                                     record {
                                       callback: func () -> ();
                                       token: HttpStreamingCallbackToken;
                                     };};
     type HttpStreamingCallbackToken = 
      record {
        content_encoding: text;
        index: nat;
        key: text;
        sha256: opt blob;
      };
     type HttpStreamingCallbackResponse = 
      record {
        body: blob;
        token: opt HttpStreamingCallbackToken;
      };
     type HttpResponse = 
      record {
        body: blob;
        headers: vec HeaderField;
        status_code: nat16;
        streaming_strategy: opt HttpStreamingStrategy;
      };
     type HttpRequest = 
      record {
        body: blob;
        headers: vec HeaderField;
        method: text;
        url: text;
      };
     type HourlyMetricsData = 
      record {
        canisterCycles: CanisterCyclesAggregatedData;
        canisterHeapMemorySize: CanisterHeapMemoryAggregatedData;
        canisterMemorySize: CanisterMemoryAggregatedData;
        timeMillis: int;
        updateCalls: UpdateCallsAggregatedData;
      };
     type HeaderField = 
      record {
        text;
        text;
      };
     type GetMetricsParameters = 
      record {
        dateFromMillis: nat;
        dateToMillis: nat;
        granularity: MetricsGranularity;
      };
     type GetLogMessagesParameters = 
      record {
        count: nat32;
        filter: opt GetLogMessagesFilter;
        fromTimeNanos: opt Nanos;
      };
     type GetLogMessagesFilter = 
      record {
        analyzeCount: nat32;
        messageContains: opt text;
        messageRegex: opt text;
      };
     type GetLatestLogMessagesParameters = 
      record {
        count: nat32;
        filter: opt GetLogMessagesFilter;
        upToTimeNanos: opt Nanos;
      };
     type GetInformationResponse = 
      record {
        logs: opt CanisterLogResponse;
        metrics: opt MetricsResponse;
        status: opt StatusResponse;
        version: opt nat;
      };
     type GetInformationRequest = 
      record {
        logs: opt CanisterLogRequest;
        metrics: opt MetricsRequest;
        status: opt StatusRequest;
        version: bool;
      };
     type Frontend = 
      record {
        accountIdentifier: AccountIdentifier__1;
        fee: nat64;
      };
     type File = 
      record {
        ctype: text;
        data: vec blob;
      };
     type Extension = text;
     type Disbursement = 
      record {
        amount: nat64;
        fromSubaccount: SubAccount__2;
        to: AccountIdentifier__5;
        tokenIndex: TokenIndex__3;
      };
     type DailyMetricsData = 
      record {
        canisterCycles: NumericEntity;
        canisterHeapMemorySize: NumericEntity;
        canisterMemorySize: NumericEntity;
        timeMillis: int;
        updateCalls: nat64;
      };
     type CommonError__3 = 
      variant {
        InvalidToken: TokenIdentifier;
        Other: text;
      };
     type CommonError__2 = 
      variant {
        InvalidToken: TokenIdentifier;
        Other: text;
      };
     type CommonError__1 = 
      variant {
        InvalidToken: TokenIdentifier;
        Other: text;
      };
     type CommonError = 
      variant {
        InvalidToken: TokenIdentifier;
        Other: text;
      };
     type CollectMetricsRequestType = 
      variant {
        force;
        normal;
      };
     type CanisterMetricsData = 
      variant {
        daily: vec DailyMetricsData;
        hourly: vec HourlyMetricsData;
      };
     type CanisterMetrics = record {data: CanisterMetricsData;};
     type CanisterMemoryAggregatedData = vec nat64;
     type CanisterLogResponse = 
      variant {
        messages: CanisterLogMessages;
        messagesInfo: CanisterLogMessagesInfo;
      };
     type CanisterLogRequest = 
      variant {
        getLatestMessages: GetLatestLogMessagesParameters;
        getMessages: GetLogMessagesParameters;
        getMessagesInfo;
      };
     type CanisterLogMessagesInfo = 
      record {
        count: nat32;
        features: vec opt CanisterLogFeature;
        firstTimeNanos: opt Nanos;
        lastTimeNanos: opt Nanos;
      };
     type CanisterLogMessages = 
      record {
        data: vec LogMessagesData;
        lastAnalyzedMessageTimeNanos: opt Nanos;
      };
     type CanisterLogFeature = 
      variant {
        filterMessageByContains;
        filterMessageByRegex;
      };
     type CanisterHeapMemoryAggregatedData = vec nat64;
     type CanisterCyclesAggregatedData = vec nat64;
     type Canister = 
      service {
        acceptCycles: () -> ();
        addAsset: (Asset) -> (nat);
        airdropTokens: (nat) -> ();
        allSettlements: () -> (vec record {
                                     TokenIndex__1;
                                     Settlement;
                                   }) query;
        availableCycles: () -> (nat) query;
        backupChunk: (nat, nat) -> (StableChunk) query;
        balance: (BalanceRequest) -> (BalanceResponse) query;
        bearer: (TokenIdentifier__3) -> (Result_9) query;
        cronDisbursements: () -> ();
        cronFailedSales: () -> ();
        cronSalesSettlements: () -> ();
        cronSettlements: () -> ();
        deleteFrontend: (text) -> ();
        details: (TokenIdentifier__1) -> (Result_8) query;
        enableSale: () -> (nat);
        extensions: () -> (vec Extension) query;
        failedSales: () ->
         (vec record {
                AccountIdentifier__4;
                SubAccount__1;
              }) query;
        frontends: () -> (vec record {
                                text;
                                Frontend;
                              });
        getCanistergeekInformation: (GetInformationRequest) ->
         (GetInformationResponse) query;
        getChunkCount: (nat) -> (nat) query;
        getDisbursements: () -> (vec Disbursement) query;
        getMinter: () -> (principal) query;
        getRegistry: () -> (vec record {
                                  TokenIndex;
                                  AccountIdentifier__2;
                                }) query;
        getTokenToAssetMapping: () -> (vec record {
                                             TokenIndex;
                                             text;
                                           }) query;
        getTokens: () -> (vec record {
                                TokenIndex;
                                Metadata__1;
                              }) query;
        grow: (nat) -> (nat);
        http_request: (HttpRequest) -> (HttpResponse) query;
        http_request_streaming_callback: (HttpStreamingCallbackToken) ->
         (HttpStreamingCallbackResponse) query;
        initCap: () -> (Result_4);
        initMint: () -> (Result_4);
        list: (ListRequest) -> (Result_3);
        listings: () -> (vec record {
                               TokenIndex__1;
                               Listing;
                               Metadata__2;
                             }) query;
        lock: (TokenIdentifier__1, nat64, AccountIdentifier__1, SubAccount__3,
         opt text) -> (Result_7);
        metadata: (TokenIdentifier__2) -> (Result_6) query;
        pendingCronJobs: () ->
         (record {
            disbursements: nat;
            failedSettlements: nat;
          }) query;
        putFrontend: (text, Frontend) -> ();
        reserve: (nat64, nat64, AccountIdentifier__4, SubAccount__1) -> (Result_5);
        restoreChunk: (StableChunk) -> ();
        retrieve: (AccountIdentifier__4) -> (Result_4);
        saleTransactions: () -> (vec SaleTransaction) query;
        salesSettings: (AccountIdentifier__3) -> (SaleSettings) query;
        salesSettlements: () -> (vec record {
                                       AccountIdentifier__4;
                                       Sale;
                                     }) query;
        settle: (TokenIdentifier__1) -> (Result_3);
        settlements: () ->
         (vec record {
                TokenIndex__1;
                AccountIdentifier__1;
                nat64;
              }) query;
        shuffleTokensForSale: () -> ();
        stats: () -> (nat64, nat64, nat64, nat64, nat, nat, nat) query;
        streamAsset: (nat, bool, blob) -> ();
        supply: () -> (Result_2) query;
        toAccountIdentifier: (text, nat) -> (AccountIdentifier__3) query;
        tokens: (AccountIdentifier__2) -> (Result_1) query;
        tokens_ext: (AccountIdentifier__2) -> (Result) query;
        transactions: () -> (vec Transaction) query;
        transfer: (TransferRequest) -> (TransferResponse);
        updateCanistergeekInformation: (UpdateInformationRequest) -> ();
        updateThumb: (text, File) -> (opt nat);
      };
     type Balance__2 = nat;
     type Balance__1 = nat;
     type BalanceResponse = 
      variant {
        err: CommonError__3;
        ok: Balance;
      };
     type BalanceRequest = 
      record {
        token: TokenIdentifier;
        user: User;
      };
     type Balance = nat;
     type Asset = 
      record {
        metadata: opt File;
        name: text;
        payload: File;
        thumbnail: opt File;
      };
     type AccountIdentifier__6 = text;
     type AccountIdentifier__5 = text;
     type AccountIdentifier__4 = text;
     type AccountIdentifier__3 = text;
     type AccountIdentifier__2 = text;
     type AccountIdentifier__1 = text;
     type AccountIdentifier = text;
     service : (principal) -> Canister";
      let result = parse_candid(data)?;
      println!("{result}");

      let _v: Value = serde_json::from_str(&result).map_err(|x| format!("{}", x))?;


      // let js_result = parse_candid_to_js(data)?;
      // println!("{js_result}");

      Ok(())
    }

    #[test]
    fn parse_test_3() -> Result<(), String> {
      let data = "type Account = record { owner : principal; subaccount : opt vec nat8 };
      type AccountBalanceArgs = record { account : text };
      type ArchiveInfo = record { canister_id : principal };
      type ArchiveOptions = record {  num_blocks_to_archive : nat64;  max_transactions_per_response : opt nat64;  trigger_threshold : nat64;  max_message_size_bytes : opt nat64;  cycles_for_archive_creation : opt nat64;  node_max_memory_size_bytes : opt nat64;  controller_id : principal;};
      type ArchivedBlocksRange = record {  callback : func (GetBlocksArgs) -> (      variant { Ok : BlockRange; Err : GetBlocksError },    ) query;  start : nat64;  length : nat64;};
      type Archives = record { archives : vec ArchiveInfo };
      type BinaryAccountBalanceArgs = record { account : vec nat8 };
      type BlockRange = record { blocks : vec CandidBlock };
      type CandidBlock = record {  transaction : CandidTransaction;  timestamp : TimeStamp;  parent_hash : opt vec nat8;};
      type CandidOperation = variant {  Approve : record {    fee : Tokens;    from : vec nat8;    allowance_e8s : int;    expires_at : opt TimeStamp;    spender : vec nat8;  };  Burn : record { from : vec nat8; amount : Tokens };  Mint : record { to : vec nat8; amount : Tokens };  Transfer : record {    to : vec nat8;    fee : Tokens;    from : vec nat8;    amount : Tokens;  };  TransferFrom : record {    to : vec nat8;    fee : Tokens;    from : vec nat8;    amount : Tokens;    spender : vec nat8;  };};
      type CandidTransaction = record {  memo : nat64;  icrc1_memo : opt vec nat8;  operation : CandidOperation;  created_at_time : TimeStamp;};
      type Decimals = record { decimals : nat32 };
      type Duration = record { secs : nat64; nanos : nat32 };
      type GetBlocksArgs = record { start : nat64; length : nat64 };
      type GetBlocksError = variant {  BadFirstBlockIndex : record {    requested_index : nat64;    first_valid_index : nat64;  };  Other : record { error_message : text; error_code : nat64 };};
      type LedgerCanisterInitPayload = record {  send_whitelist : vec principal;  token_symbol : opt text;  transfer_fee : opt Tokens;  minting_account : text;  transaction_window : opt Duration;  max_message_size_bytes : opt nat64;  icrc1_minting_account : opt Account;  archive_options : opt ArchiveOptions;  initial_values : vec record { text; Tokens };  token_name : opt text;};
      type Name = record { name : text };
      type QueryBlocksResponse = record {  certificate : opt vec nat8;  blocks : vec CandidBlock;  chain_length : nat64;  first_block_index : nat64;  archived_blocks : vec ArchivedBlocksRange;};
      type Result = variant { Ok : nat; Err : TransferError };
      type Result_1 = variant { Ok : nat64; Err : TransferError_1 };
      type SendArgs = record {  to : text;  fee : Tokens;  memo : nat64;  from_subaccount : opt vec nat8;  created_at_time : opt TimeStamp;  amount : Tokens;};
      type StandardRecord = record { url : text; name : text };
      type Symbol = record { symbol : text };
      type TimeStamp = record { timestamp_nanos : nat64 };
      type Tokens = record { e8s : nat64 };
      type TransferArg = record {  to : Account;  fee : opt nat;  memo : opt vec nat8;  from_subaccount : opt vec nat8;  created_at_time : opt nat64;  amount : nat;};
      type TransferArgs = record {  to : vec nat8;  fee : Tokens;  memo : nat64;  from_subaccount : opt vec nat8;  created_at_time : opt TimeStamp;  amount : Tokens;};
      type TransferError = variant {  GenericError : record { message : text; error_code : nat };  TemporarilyUnavailable;  BadBurn : record { min_burn_amount : nat };  Duplicate : record { duplicate_of : nat };  BadFee : record { expected_fee : nat };  CreatedInFuture : record { ledger_time : nat64 };  TooOld;  InsufficientFunds : record { balance : nat };};
      type TransferError_1 = variant {  TxTooOld : record { allowed_window_nanos : nat64 };  BadFee : record { expected_fee : Tokens };  TxDuplicate : record { duplicate_of : nat64 };  TxCreatedInFuture;  InsufficientFunds : record { balance : Tokens };};
      type TransferFee = record { transfer_fee : Tokens };
      type Value = variant { Int : int; Nat : nat; Blob : vec nat8; Text : text };
      service : (LedgerCanisterInitPayload) -> {  account_balance : (BinaryAccountBalanceArgs) -> (Tokens) query;  account_balance_dfx : (AccountBalanceArgs) -> (Tokens) query;  archives : () -> (Archives) query;  decimals : () -> (Decimals) query;  icrc1_balance_of : (Account) -> (nat) query;  icrc1_decimals : () -> (nat8) query;  icrc1_fee : () -> (nat) query;  icrc1_metadata : () -> (vec record { text; Value }) query;  icrc1_minting_account : () -> (opt Account) query;  icrc1_name : () -> (text) query;  icrc1_supported_standards : () -> (vec StandardRecord) query;  icrc1_symbol : () -> (text) query;  icrc1_total_supply : () -> (nat) query;  icrc1_transfer : (TransferArg) -> (Result);  name : () -> (Name) query;  query_blocks : (GetBlocksArgs) -> (QueryBlocksResponse) query;  send_dfx : (SendArgs) -> (nat64);  symbol : () -> (Symbol) query;  transfer : (TransferArgs) -> (Result_1);  transfer_fee : (record {}) -> (TransferFee) query;}";
      let result = parse_candid(data)?;
      let _v: Value = serde_json::from_str(&result).map_err(|x| format!("{}", x))?;
      println!("{result}");

      // let js_result = parse_candid_to_js(data)?;
      // println!("{js_result}");

      Ok(())
    }

    #[test]
    fn parse_test_2() -> Result<(), String> {
      let data = "type Result = variant { Ok : nat32; Err : text };service : () -> {  test_balance : () -> (nat64) query;  test_balance128 : () -> (nat) query;  test_caller : () -> (principal) query;  test_canister_version : () -> (nat64) query;  test_data_certificate : () -> (opt vec nat8) query;  test_id : () -> (principal) query;  test_instruction_counter : () -> (nat64) query;  test_inter_canister : () -> (Result);  test_stable64_size : () -> (nat64) query;  test_stable_size : () -> (nat32) query;  test_updates : () -> (Result);}";
      let result = parse_candid(data)?;
      let _v: Value = serde_json::from_str(&result).map_err(|x| format!("{}", x))?;

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
        let _v: Value = serde_json::from_str(&result).map_err(|x| format!("{}", x))?;



        Ok(())
    }
}
